/**
 * Google Ads Provider
 *
 * Handles Google OAuth flow for Google Ads scopes, and wraps the
 * Google Ads API calls needed for the lead-form integration.
 *
 * NOTE: This module runs server-side only.
 */
import { google } from 'googleapis';
import type { GoogleAdsCustomerAccount, GoogleAdsLeadForm } from './types';

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

const GOOGLE_ADS_SCOPES = [
  'https://www.googleapis.com/auth/adwords',
  'openid',
  'email',
  'profile',
];

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/google-ads/callback`,
  );
}

/**
 * Generates the Google OAuth consent URL for the Google Ads scope.
 */
export function buildGoogleAdsOAuthUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_ADS_SCOPES,
    state,
    prompt: 'consent',
    include_granted_scopes: true,
  });
}

/**
 * Exchanges an authorization code for Google OAuth tokens.
 */
export async function exchangeGoogleAdsCode(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  email?: string;
}> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Fetch user email for display
  let email: string | undefined;
  try {
    const oauth2 = google.oauth2({ auth: client, version: 'v2' });
    const { data } = await oauth2.userinfo.get();
    email = data.email ?? undefined;
  } catch {
    // Non-fatal — proceed without email
  }

  return {
    access_token: tokens.access_token ?? '',
    refresh_token: tokens.refresh_token ?? undefined,
    expires_at: tokens.expiry_date ?? undefined,
    email,
  };
}

/**
 * Refreshes an expired access token using the stored refresh token.
 */
export async function refreshGoogleAdsToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_at?: number }> {
  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return {
    access_token: credentials.access_token ?? '',
    expires_at: credentials.expiry_date ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Google Ads API helpers
// ---------------------------------------------------------------------------

/**
 * Fetches the list of Google Ads Customer Accounts accessible to the OAuth user.
 *
 * Uses the Google Ads REST API (v17) — the googleapis npm package does not
 * bundle the Ads API client natively, so we use fetch directly.
 *
 * Requires: access_token with https://www.googleapis.com/auth/adwords scope.
 * Requires: GOOGLE_ADS_DEVELOPER_TOKEN env variable.
 */
export async function getGoogleAdsCustomerAccounts(
  accessToken: string,
): Promise<GoogleAdsCustomerAccount[]> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN environment variable is not set.');
  }

  const res = await fetch(
    'https://googleads.googleapis.com/v17/customers:listAccessibleCustomers',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
      },
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to list accessible customers: ${err}`);
  }

  const json = (await res.json()) as { resourceNames?: string[] };
  const resourceNames = json.resourceNames ?? [];

  // Fetch account details for each customer
  const accounts: GoogleAdsCustomerAccount[] = [];
  for (const resourceName of resourceNames.slice(0, 20)) {
    const customerId = resourceName.replace('customers/', '');
    try {
      const detailRes = await fetch(
        `https://googleads.googleapis.com/v17/customers/${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'developer-token': developerToken,
            'login-customer-id': customerId,
          },
        },
      );
      if (detailRes.ok) {
        const detail = (await detailRes.json()) as {
          descriptiveName?: string;
          currencyCode?: string;
          timeZone?: string;
        };
        accounts.push({
          customer_id: customerId,
          account_name: detail.descriptiveName ?? `Account ${customerId}`,
          currency_code: detail.currencyCode,
          time_zone: detail.timeZone,
        });
      }
    } catch {
      // Skip accounts that fail to load
      accounts.push({
        customer_id: customerId,
        account_name: `Account ${customerId}`,
      });
    }
  }

  return accounts;
}

/**
 * Fetches Google Ads Lead Form Extensions for a given customer account.
 *
 * Uses the Google Ads Query Language (GAQL) via the REST API.
 */
export async function fetchGoogleAdsLeadFormsByCampaign(
  accessToken: string,
  customerId: string,
): Promise<GoogleAdsLeadForm[]> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN environment variable is not set.');
  }

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign_asset.asset,
      asset.lead_form_asset.business_name,
      asset.lead_form_asset.headline,
      asset.id
    FROM campaign_asset
    WHERE campaign_asset.asset_type = 'LEAD_FORM'
      AND campaign_asset.status = 'ENABLED'
  `;

  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'login-customer-id': customerId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch lead forms for customer ${customerId}: ${err}`);
  }

  const results = (await res.json()) as Array<{
    results?: Array<{
      campaign?: { id?: string; name?: string };
      asset?: { id?: string; leadFormAsset?: { businessName?: string; headline?: string } };
    }>;
  }>;

  const forms: GoogleAdsLeadForm[] = [];
  for (const batch of results) {
    for (const row of batch.results ?? []) {
      const formId = row.asset?.id;
      const formName = row.asset?.leadFormAsset?.headline ?? row.asset?.leadFormAsset?.businessName ?? `Form ${formId}`;
      const campaignId = row.campaign?.id;
      const campaignName = row.campaign?.name ?? `Campaign ${campaignId}`;

      if (formId && campaignId) {
        forms.push({
          form_id: formId,
          form_name: formName,
          campaign_id: campaignId,
          campaign_name: campaignName,
          customer_id: customerId,
        });
      }
    }
  }

  return forms;
}

/**
 * Fetches the actual lead data from Google Ads API using the lead_id.
 * Google webhooks only send identifiers, not the lead content.
 */
export async function fetchGoogleAdsLeadData(
  accessToken: string,
  customerId: string,
  leadId: string,
): Promise<Record<string, string>> {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) {
    throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN environment variable is not set.');
  }

  const res = await fetch(
    `https://googleads.googleapis.com/v17/customers/${customerId}/leadFormLeadData/${leadId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'login-customer-id': customerId,
      },
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch lead data for lead ${leadId}: ${err}`);
  }

  const json = (await res.json()) as {
    columnData?: Array<{ columnId?: string; stringValue?: string }>;
  };

  // Flatten into a simple key-value map
  const data: Record<string, string> = {};
  for (const col of json.columnData ?? []) {
    if (col.columnId && col.stringValue) {
      data[col.columnId] = col.stringValue;
    }
  }

  return data;
}
