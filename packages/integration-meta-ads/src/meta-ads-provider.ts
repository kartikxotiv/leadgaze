/**
 * Meta Ads Provider
 *
 * Handles Facebook OAuth flow for the Meta Ads Lead Forms integration,
 * and wraps all Meta Graph API calls needed to manage pages, forms and leads.
 *
 * NOTE: This module runs server-side only.
 */

import type { MetaAdsLeadForm, MetaAdsBusiness } from './types';

const META_GRAPH_VERSION = 'v21.0';
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

const META_SCOPES = [
  'email',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_ads',
  'leads_retrieval',
].join(',');

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

/**
 * Builds the Facebook OAuth consent URL.
 */
export function buildMetaAdsOAuthUrl(state: string): string {
  const appId = process.env.META_APP_ID;
  const redirectUri = process.env.META_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/meta/callback`;

  if (!appId) {
    throw new Error('META_APP_ID environment variable is not set.');
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    scope: META_SCOPES,
    response_type: 'code',
    state,
  });

  return `https://www.facebook.com/dialog/oauth?${params.toString()}`;
}

/**
 * Exchanges an authorization code for a short-lived token, then upgrades
 * it to a long-lived (60-day) user access token.
 */
export async function exchangeMetaAdsCode(code: string): Promise<{
  user_access_token: string;
  token_expires_at: number;
  user_id: string;
  user_name?: string;
}> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/integrations/meta/callback`;

  if (!appId || !appSecret) {
    throw new Error('META_APP_ID and META_APP_SECRET environment variables are required.');
  }

  // Step 1: Exchange code for short-lived token
  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const tokenRes = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${tokenParams.toString()}`,
  );

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Meta token exchange failed: ${err}`);
  }

  const tokenData = await tokenRes.json() as {
    access_token: string;
    token_type: string;
    expires_in?: number;
  };

  // Step 2: Upgrade to long-lived token (valid 60 days)
  const longLivedParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: tokenData.access_token,
  });

  const longLivedRes = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${longLivedParams.toString()}`,
  );

  if (!longLivedRes.ok) {
    const err = await longLivedRes.text();
    throw new Error(`Meta long-lived token exchange failed: ${err}`);
  }

  const longLivedData = await longLivedRes.json() as {
    access_token: string;
    expires_in?: number;
  };

  // Step 3: Get the user's ID and name
  const meRes = await fetch(
    `${META_GRAPH_BASE}/me?fields=id,name&access_token=${longLivedData.access_token}`,
  );
  const meData = meRes.ok ? await meRes.json() as { id: string; name: string } : { id: '', name: '' };

  const expiresIn = longLivedData.expires_in ?? 5184000; // 60 days default
  const token_expires_at = Date.now() + expiresIn * 1000;

  return {
    user_access_token: longLivedData.access_token,
    token_expires_at,
    user_id: meData.id,
    user_name: meData.name,
  };
}

// ---------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------

export interface MetaPageResult {
  page_id: string;
  page_name: string;
  page_access_token: string;
  category?: string;
}

/**
 * Fetches all Facebook Pages the user manages, along with their page access tokens.
 * Uses GET /me/accounts.
 */
export async function fetchMetaPages(userAccessToken: string): Promise<MetaPageResult[]> {
  const res = await fetch(
    `${META_GRAPH_BASE}/me/accounts?fields=id,name,access_token,category&access_token=${userAccessToken}`,
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch Meta pages: ${err}`);
  }

  const data = await res.json() as { data: Array<{
    id: string;
    name: string;
    access_token: string;
    category?: string;
  }> };

  return (data.data ?? []).map((p) => ({
    page_id: p.id,
    page_name: p.name,
    page_access_token: p.access_token,
    category: p.category,
  }));
}

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------

/**
 * Fetches Meta businesses the user belongs to.
 * Uses GET /me/businesses.
 */
export async function fetchMetaBusinesses(userAccessToken: string): Promise<MetaAdsBusiness[]> {
  const res = await fetch(
    `${META_GRAPH_BASE}/me/businesses?fields=id,name&access_token=${userAccessToken}`,
  );

  if (!res.ok) {
    // Non-fatal — user may not have business manager access
    console.warn('[integration-meta-ads] Could not fetch businesses:', await res.text());
    return [];
  }

  const data = await res.json() as { data: Array<{ id: string; name: string }> };
  return (data.data ?? []).map((b) => ({ id: b.id, name: b.name }));
}

// ---------------------------------------------------------------------------
// Page subscription
// ---------------------------------------------------------------------------

/**
 * Subscribes a Facebook Page to the Leadgaze Meta app so it will receive
 * webhook lead notifications. Must be called once per page.
 * Uses POST /{page-id}/subscribed_apps.
 */
export async function subscribePageToApp(
  pageId: string,
  pageAccessToken: string,
): Promise<void> {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error('META_APP_ID is not set.');

  const res = await fetch(
    `${META_GRAPH_BASE}/${pageId}/subscribed_apps`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscribed_fields: ['leadgen'],
        access_token: pageAccessToken,
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to subscribe page ${pageId}: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// Lead Forms
// ---------------------------------------------------------------------------

/**
 * Fetches all lead forms for a given Facebook page.
 * Uses GET /{page-id}/leadgen_forms.
 */
export async function fetchMetaLeadForms(
  pageId: string,
  pageAccessToken: string,
): Promise<MetaAdsLeadForm[]> {
  const res = await fetch(
    `${META_GRAPH_BASE}/${pageId}/leadgen_forms?fields=id,name,status,questions&access_token=${pageAccessToken}`,
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch lead forms for page ${pageId}: ${err}`);
  }

  const data = await res.json() as { data: Array<{
    id: string;
    name: string;
    status?: string;
    questions?: Array<{ key: string; label?: string; type: string }>;
  }> };

  return (data.data ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
    questions: f.questions,
  }));
}

// ---------------------------------------------------------------------------
// Lead data
// ---------------------------------------------------------------------------

/**
 * Fetches the full lead submission data for a given leadgen_id.
 * Uses GET /{leadgen_id}?fields=field_data.
 *
 * Returns a key-value map of field_name → value.
 * e.g. { "email": "john@example.com", "full_name": "John Doe" }
 */
export async function fetchMetaLeadData(
  leadgenId: string,
  pageAccessToken: string,
): Promise<Record<string, string>> {
  const res = await fetch(
    `${META_GRAPH_BASE}/${leadgenId}?fields=field_data,created_time&access_token=${pageAccessToken}`,
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to fetch lead data for leadgen_id=${leadgenId}: ${err}`);
  }

  const data = await res.json() as {
    field_data?: Array<{ name: string; values: string[] }>;
  };

  const result: Record<string, string> = {};
  for (const field of data.field_data ?? []) {
    result[field.name] = field.values[0] ?? '';
  }

  return result;
}

// ---------------------------------------------------------------------------
// Token refresh (Meta does not support automatic refresh — user must reconnect)
// ---------------------------------------------------------------------------

/**
 * Checks if the long-lived token is expiring soon (within 7 days).
 * Meta long-lived tokens cannot be programmatically refreshed — the user
 * must re-authorize if expired.
 */
export function isMetaTokenExpiringSoon(tokenExpiresAt: number): boolean {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  return Date.now() > tokenExpiresAt - SEVEN_DAYS_MS;
}
