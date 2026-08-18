/**
 * Google Ads API Controllers
 *
 * All route handler logic for the Google Ads integration.
 * These functions are called from apps/web/app/api routes.
 * They follow the same pattern as integration-zapier's api-controllers.ts.
 */
import { NextResponse } from 'next/server';

import {
  resolveCreatorId,
  resolveDefaultLeadStatusId,
  resolveOrCreateLeadSource,
} from '@kit/integration-website';
import type { Connector } from '@kit/integration-website';

import {
  buildGoogleAdsOAuthUrl,
  exchangeGoogleAdsCode,
  fetchGoogleAdsLeadData,
  getGoogleAdsCustomerAccounts,
  refreshGoogleAdsToken,
} from './google-ads-provider';
import type { GoogleAdsSettingsData } from './types';

// ---------------------------------------------------------------------------
// GET /api/workspaces/[id]/google-ads
// Returns connection status, active accounts, configured forms, field mappings, and recent logs.
// ---------------------------------------------------------------------------

export async function handleGetGoogleAdsSettings(
  workspaceId: string,
  supabase: any,
): Promise<NextResponse> {
  const { data: connectionData } = await supabase
    .schema('core')
    .from('integration_connections')
    .select('id, status, config, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'google_ads')
    .eq('is_deleted', false)
    .maybeSingle();

  const connectionId =
    connectionData?.id || '00000000-0000-0000-0000-000000000000';

  const [accountsResult, formsResult, logsResult] = await Promise.all([
    supabase
      .schema('core')
      .from('integration_accounts')
      .select(
        'id, external_account_id, email, display_name, metadata, status, created_at, updated_at',
      )
      .eq('workspace_id', workspaceId)
      .eq('connection_id', connectionId)
      .eq('is_deleted', false),

    supabase
      .schema('core')
      .from('google_ads_forms')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),

    supabase
      .schema('core')
      .from('google_ads_sync_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const connection = connectionData
    ? { ...connectionData, workspace_id: workspaceId, provider: 'google_ads' }
    : null;

  // Fetch field mappings for all configured forms
  let mappings: unknown[] = [];
  const forms = formsResult.data ?? [];
  if (forms.length > 0) {
    const formIds = forms.map((f: { id: string }) => f.id);
    const { data: mappingData } = await supabase
      .schema('core')
      .from('google_ads_field_mappings')
      .select('*')
      .in('form_id', formIds);
    mappings = mappingData ?? [];
  }

  const payload: GoogleAdsSettingsData = {
    connection,
    accounts: accountsResult.data ?? [],
    forms,
    mappings: mappings as any[],
    recentLogs: logsResult.data ?? [],
  };

  return NextResponse.json({ success: true, data: payload });
}

// ---------------------------------------------------------------------------
// POST /api/workspaces/[id]/google-ads — action dispatcher
// ---------------------------------------------------------------------------

export async function handleMutateGoogleAdsSettings(
  workspaceId: string,
  action: string,
  body: Record<string, unknown>,
  userId: string,
  supabase: any,
): Promise<NextResponse> {
  switch (action) {
    case 'get-auth-url':
      return handleGetAuthUrl(workspaceId, userId);

    case 'disconnect':
      return handleDisconnect(
        workspaceId,
        body.accountId as string,
        userId,
        supabase,
      );

    case 'save-forms':
      return handleSaveForms(
        workspaceId,
        body.forms as any[],
        userId,
        supabase,
      );

    case 'save-field-mappings':
      return handleSaveFieldMappings(
        workspaceId,
        body.form_id as string,
        body.mappings as Array<{
          google_field: string;
          leadgaze_field: string;
        }>,
        supabase,
      );

    case 'fetch-accounts':
      return handleFetchAccounts(
        workspaceId,
        body.accountId as string,
        supabase,
      );

    default:
      return NextResponse.json(
        { success: false, message: 'Invalid action' },
        { status: 400 },
      );
  }
}

// ---------------------------------------------------------------------------
// get-auth-url
// Generates the Google OAuth consent URL for the Google Ads scope.
// ---------------------------------------------------------------------------

function handleGetAuthUrl(workspaceId: string, userId: string): NextResponse {
  const state = Buffer.from(
    JSON.stringify({
      workspaceId,
      userId,
      returnUrl: `/home/sales/workspace-settings/integrations/google-ads`,
    }),
  ).toString('base64');

  const url = buildGoogleAdsOAuthUrl(state);
  return NextResponse.json({ success: true, data: { url } });
}

// ---------------------------------------------------------------------------
// disconnect
// Soft-deletes a specific integration_account row.
// ---------------------------------------------------------------------------

async function handleDisconnect(
  workspaceId: string,
  accountId: string,
  userId: string,
  supabase: any,
): Promise<NextResponse> {
  if (!accountId) {
    return NextResponse.json(
      { success: false, message: 'accountId is required to disconnect.' },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .schema('core')
    .from('integration_accounts')
    .update({
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq('id', accountId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error(
      '[integration-google-ads] Failed to disconnect account:',
      error,
    );
    return NextResponse.json(
      { success: false, message: 'Failed to disconnect Google Ads account.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: null });
}

// ---------------------------------------------------------------------------
// fetch-accounts
// Reads stored tokens for a specific account and calls Google Ads API.
// ---------------------------------------------------------------------------

async function handleFetchAccounts(
  workspaceId: string,
  accountId: string,
  supabase: any,
): Promise<NextResponse> {
  if (!accountId) {
    return NextResponse.json(
      { success: false, message: 'accountId is required.' },
      { status: 400 },
    );
  }

  const { data: account } = await supabase
    .schema('core')
    .from('integration_accounts')
    .select('id, metadata')
    .eq('id', accountId)
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!account) {
    return NextResponse.json(
      { success: false, message: 'Google Ads account not found.' },
      { status: 404 },
    );
  }

  let { access_token, refresh_token, expires_at } = account.metadata as {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
  };

  // Refresh token if expired
  if (expires_at && Date.now() > expires_at && refresh_token) {
    try {
      const refreshed = await refreshGoogleAdsToken(refresh_token);
      access_token = refreshed.access_token;
      const updatedMetadata = {
        ...account.metadata,
        access_token: refreshed.access_token,
        expires_at: refreshed.expires_at,
      };
      await supabase
        .schema('core')
        .from('integration_accounts')
        .update({ metadata: updatedMetadata })
        .eq('id', account.id);
    } catch (e) {
      console.error('[integration-google-ads] Token refresh failed:', e);
    }
  }

  if (!access_token) {
    return NextResponse.json(
      {
        success: false,
        message: 'Access token unavailable. Please reconnect.',
      },
      { status: 401 },
    );
  }

  try {
    const accounts = await getGoogleAdsCustomerAccounts(access_token);

    // Persist updated account list in config
    await supabase
      .schema('core')
      .from('integration_accounts')
      .update({
        metadata: { ...account.metadata, customer_accounts: accounts },
      })
      .eq('id', account.id);

    return NextResponse.json({ success: true, data: { accounts } });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to fetch accounts.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// save-forms
// Upserts the list of selected forms with their routing configuration.
// ---------------------------------------------------------------------------

async function handleSaveForms(
  workspaceId: string,
  forms: Array<{
    connection_id: string;
    account_id: string;
    customer_id: string;
    campaign_id?: string;
    campaign_name?: string;
    form_id: string;
    form_name: string;
    default_owner_id?: string;
    is_active?: boolean;
    tags?: string[];
  }>,
  userId: string,
  supabase: any,
): Promise<NextResponse> {
  if (!Array.isArray(forms) || forms.length === 0) {
    return NextResponse.json(
      { success: false, message: 'No forms provided.' },
      { status: 400 },
    );
  }

  const rows = forms.map((f) => ({
    workspace_id: workspaceId,
    connection_id: f.connection_id,
    account_id: f.account_id,
    customer_id: f.customer_id,
    campaign_id: f.campaign_id ?? null,
    campaign_name: f.campaign_name ?? null,
    form_id: f.form_id,
    form_name: f.form_name,
    default_owner_id: f.default_owner_id ?? null,
    is_active: f.is_active ?? true,
    tags: f.tags ?? [],
    created_by: userId,
    updated_by: userId,
  }));

  const { data, error } = await supabase
    .schema('core')
    .from('google_ads_forms')
    .upsert(rows, { onConflict: 'workspace_id,form_id' })
    .select();

  if (error) {
    console.error('[integration-google-ads] Failed to save forms:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save form configuration.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data });
}

// ---------------------------------------------------------------------------
// save-field-mappings
// Replaces all field mappings for a specific form.
// ---------------------------------------------------------------------------

async function handleSaveFieldMappings(
  workspaceId: string,
  formId: string,
  mappings: Array<{ google_field: string; leadgaze_field: string }>,
  supabase: any,
): Promise<NextResponse> {
  if (!formId) {
    return NextResponse.json(
      { success: false, message: 'form_id is required.' },
      { status: 400 },
    );
  }

  // Delete existing mappings for this form, then insert fresh
  await supabase
    .schema('core')
    .from('google_ads_field_mappings')
    .delete()
    .eq('form_id', formId)
    .eq('workspace_id', workspaceId);

  if (!Array.isArray(mappings) || mappings.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const rows = mappings.map((m) => ({
    workspace_id: workspaceId,
    form_id: formId,
    google_field: m.google_field,
    leadgaze_field: m.leadgaze_field,
  }));

  const { data, error } = await supabase
    .schema('core')
    .from('google_ads_field_mappings')
    .insert(rows)
    .select();

  if (error) {
    console.error(
      '[integration-google-ads] Failed to save field mappings:',
      error,
    );
    return NextResponse.json(
      { success: false, message: 'Failed to save field mappings.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data });
}

// ---------------------------------------------------------------------------
// Webhook handler — POST /api/integrations/google-ads/webhook
// ---------------------------------------------------------------------------

export async function handleGoogleAdsWebhook(
  payload: {
    lead_id?: string;
    form_id?: string;
    customer_id?: string;
    campaign_id?: string;
    gclid?: string;
  },
  supabase: any,
  hooks?: {
    beforeCreateLead?: (workspaceId: string) => Promise<{
      commit(resourceId: string): Promise<void>;
      rollback(): Promise<void>;
    }>;
  },
): Promise<NextResponse> {
  const { lead_id, form_id, customer_id } = payload;

  if (!lead_id || !form_id || !customer_id) {
    return NextResponse.json(
      {
        success: false,
        message: 'Missing required fields: lead_id, form_id, customer_id',
      },
      { status: 400 },
    );
  }

  // Find the configured form
  const { data: formConfig } = await supabase
    .schema('core')
    .from('google_ads_forms')
    .select('*')
    .eq('form_id', form_id)
    .eq('customer_id', customer_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!formConfig) {
    console.warn(
      `[integration-google-ads] No active form config for form_id=${form_id}, customer_id=${customer_id}`,
    );
    return NextResponse.json({
      success: true,
      message: 'Form not configured. Skipped.',
    });
  }

  const { workspace_id, account_id } = formConfig;

  if (!account_id) {
    return NextResponse.json({
      success: false,
      message: 'Form is not associated with a connected Google account.',
    });
  }

  // Get OAuth tokens from the connected account
  const { data: account } = await supabase
    .schema('core')
    .from('integration_accounts')
    .select('metadata')
    .eq('id', account_id)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!account) {
    await writeSyncLog(supabase, {
      workspace_id,
      customer_id,
      form_id,
      lead_id,
      status: 'failed',
      error_message:
        'Associated Google account connection not found or was disconnected.',
      payload,
    });
    return NextResponse.json({
      success: false,
      message: 'Google account connection missing.',
    });
  }

  let accessToken: string | undefined = account.metadata?.access_token;
  const refreshToken: string | undefined = account.metadata?.refresh_token;
  const expiresAt: number | undefined = account.metadata?.expires_at;

  // Refresh if expired
  if (expiresAt && Date.now() > expiresAt && refreshToken) {
    try {
      const refreshed = await refreshGoogleAdsToken(refreshToken);
      accessToken = refreshed.access_token;
      await supabase
        .schema('core')
        .from('integration_accounts')
        .update({
          metadata: {
            ...account.metadata,
            access_token: refreshed.access_token,
            expires_at: refreshed.expires_at,
          },
        })
        .eq('id', account_id);
    } catch (e) {
      console.error(
        '[integration-google-ads] Token refresh failed during webhook:',
        e,
      );
    }
  }

  if (!accessToken) {
    await writeSyncLog(supabase, {
      workspace_id,
      customer_id,
      form_id,
      lead_id,
      status: 'failed',
      error_message:
        'Access token unavailable. Please reconnect your Google account.',
      payload,
    });
    return NextResponse.json({
      success: false,
      message: 'Auth token unavailable.',
    });
  }

  // Fetch lead data from Google Ads API
  let rawLeadData: Record<string, string> = {};
  try {
    rawLeadData = await fetchGoogleAdsLeadData(
      accessToken,
      customer_id,
      lead_id,
    );
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Failed to fetch lead data.';
    console.error('[integration-google-ads] Lead data fetch failed:', e);
    await writeSyncLog(supabase, {
      workspace_id,
      customer_id,
      form_id,
      lead_id,
      status: 'failed',
      error_message: errorMessage,
      payload,
    });
    return NextResponse.json({
      success: true,
      message: 'Lead data fetch failed. Logged.',
    });
  }

  // Apply field mappings
  const { data: mappings } = await supabase
    .schema('core')
    .from('google_ads_field_mappings')
    .select('google_field, leadgaze_field')
    .eq('form_id', formConfig.id)
    .eq('workspace_id', workspace_id);

  const mappingMap: Record<string, string> = {};
  for (const m of mappings ?? []) {
    mappingMap[m.google_field] = m.leadgaze_field;
  }

  const DEFAULT_MAPPINGS: Record<string, string> = {
    FULL_NAME: 'name',
    EMAIL: 'email',
    PHONE_NUMBER: 'phone_number',
    COMPANY_NAME: 'company_name',
    JOB_TITLE: 'designation',
  };

  const effectiveMappings =
    Object.keys(mappingMap).length > 0 ? mappingMap : DEFAULT_MAPPINGS;
  const normalizedPayload: Record<string, string> = {};

  for (const [googleField, value] of Object.entries(rawLeadData)) {
    const leadgazeField = effectiveMappings[googleField];
    if (leadgazeField) {
      normalizedPayload[leadgazeField] = value;
    }
  }

  if (normalizedPayload.name && !normalizedPayload.first_name) {
    const parts = normalizedPayload.name.trim().split(/\s+/);
    normalizedPayload.first_name = parts[0] ?? '';
    normalizedPayload.last_name = parts.slice(1).join(' ') || 'Ads Lead';
  }

  if (normalizedPayload.email) {
    const { data: existing } = await supabase
      .from('crm_leads')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('email', normalizedPayload.email)
      .maybeSingle();

    if (existing) {
      await writeSyncLog(supabase, {
        workspace_id,
        customer_id,
        form_id,
        lead_id,
        status: 'duplicate',
        error_message: `Existing CRM lead found for email: ${normalizedPayload.email}`,
        payload: { ...payload, rawLeadData },
        crm_lead_id: existing.id,
      });
      return NextResponse.json({
        success: true,
        message: 'Duplicate lead detected. Skipped.',
      });
    }
  }

  const reservation = await hooks?.beforeCreateLead?.(workspace_id);
  try {
    const [statusId, creatorId] = await Promise.all([
      resolveDefaultLeadStatusId(supabase, workspace_id),
      resolveCreatorId(
        supabase,
        { default_owner_id: formConfig.default_owner_id } as Connector,
        workspace_id,
      ),
    ]);

    const leadSourceId = await resolveOrCreateLeadSource(
      supabase,
      workspace_id,
      `google_ads_${form_id}`,
      `Google Ads: ${formConfig.form_name}`,
      creatorId,
    );

    const { data: newLead, error: leadError } = await supabase
      .from('crm_leads')
      .insert({
        workspace_id,
        first_name: normalizedPayload.first_name || 'Google',
        last_name: normalizedPayload.last_name || 'Ads Lead',
        email: normalizedPayload.email || null,
        phone_number: normalizedPayload.phone_number || null,
        company_name: normalizedPayload.company_name || null,
        notes: `Lead from Google Ads form: ${formConfig.form_name}\nCampaign: ${formConfig.campaign_name ?? 'N/A'}\nCustomer ID: ${customer_id}\nGCLID: ${payload.gclid ?? 'N/A'}`,
        owner_id: formConfig.default_owner_id || null,
        status_id: statusId,
        created_by: creatorId,
        source_id: leadSourceId,
      })
      .select()
      .single();

    if (leadError) {
      throw leadError;
    }

    await reservation?.commit(newLead.id);

    await writeSyncLog(supabase, {
      workspace_id,
      customer_id,
      form_id,
      lead_id,
      status: 'success',
      payload: { ...payload, rawLeadData },
      crm_lead_id: newLead.id,
    });

    return NextResponse.json({ success: true, data: { lead_id: newLead.id } });
  } catch (e) {
    await reservation?.rollback();
    const errorMessage =
      e instanceof Error ? e.message : 'CRM lead creation failed.';
    console.error('[integration-google-ads] Lead creation failed:', e);
    await writeSyncLog(supabase, {
      workspace_id,
      customer_id,
      form_id,
      lead_id,
      status: 'failed',
      error_message: errorMessage,
      payload: { ...payload, rawLeadData },
    });
    return NextResponse.json({
      success: true,
      message: 'Lead processing failed. Logged.',
    });
  }
}

// ---------------------------------------------------------------------------
// OAuth Callback handler
// ---------------------------------------------------------------------------

export async function handleGoogleAdsCallback(
  code: string,
  rawState: string,
  supabase: any,
): Promise<{ redirectUrl: string }> {
  let workspaceId = '';
  let userId = '';
  let returnUrl = '/home/sales/workspace-settings/integrations/google-ads';

  try {
    const state = JSON.parse(Buffer.from(rawState, 'base64').toString('utf-8'));
    workspaceId = state.workspaceId ?? '';
    userId = state.userId ?? '';
    returnUrl = state.returnUrl ?? returnUrl;
  } catch {
    return {
      redirectUrl: `/home/sales/workspace-settings?error=invalid_state`,
    };
  }

  if (!workspaceId) {
    return {
      redirectUrl: `/home/sales/workspace-settings?error=missing_workspace`,
    };
  }

  try {
    const tokens = await exchangeGoogleAdsCode(code);

    if (!tokens.email) {
      return { redirectUrl: `${returnUrl}?error=missing_email` };
    }

    // 1. Get or create parent connection record
    let connectionId = '';
    const { data: existingConn } = await supabase
      .schema('core')
      .from('integration_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'google_ads')
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingConn) {
      connectionId = existingConn.id;
    } else {
      const { data: newConn, error: connErr } = await supabase
        .schema('core')
        .from('integration_connections')
        .insert({
          workspace_id: workspaceId,
          provider: 'google_ads',
          status: 'active',
          config: {},
          is_deleted: false,
          created_by: userId,
          updated_by: userId,
        })
        .select('id')
        .single();

      if (connErr || !newConn) {
        console.error(
          '[integration-google-ads] Failed to create connection parent:',
          connErr,
        );
        return { redirectUrl: `${returnUrl}?error=db_error` };
      }
      connectionId = newConn.id;
    }

    // Fetch initial customer accounts list
    let customerAccounts: unknown[] = [];
    try {
      customerAccounts = await getGoogleAdsCustomerAccounts(
        tokens.access_token,
      );
    } catch (e) {
      console.warn(
        '[integration-google-ads] Could not fetch accounts on connect:',
        e,
      );
    }

    const metadata = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at,
      customer_accounts: customerAccounts,
    };

    // 2. Upsert the individual Google account record in integration_accounts
    const { data: existingAccount } = await supabase
      .schema('core')
      .from('integration_accounts')
      .select('id')
      .eq('connection_id', connectionId)
      .eq('external_account_id', tokens.email)
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingAccount) {
      const { error } = await supabase
        .schema('core')
        .from('integration_accounts')
        .update({
          metadata,
          status: 'active',
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAccount.id);

      if (error) {
        console.error(
          '[integration-google-ads] Failed to update integration account:',
          error,
        );
        return { redirectUrl: `${returnUrl}?error=db_error` };
      }
    } else {
      const { error } = await supabase
        .schema('core')
        .from('integration_accounts')
        .insert({
          workspace_id: workspaceId,
          connection_id: connectionId,
          external_account_id: tokens.email,
          email: tokens.email,
          display_name: tokens.email,
          metadata,
          status: 'active',
          owner_user_id: userId,
          access_scope: 'workspace',
          created_by: userId,
          updated_by: userId,
        });

      if (error) {
        console.error(
          '[integration-google-ads] Failed to insert integration account:',
          error,
        );
        return { redirectUrl: `${returnUrl}?error=db_error` };
      }
    }

    return { redirectUrl: `${returnUrl}?connected=true` };
  } catch (e) {
    console.error('[integration-google-ads] OAuth callback failed:', e);
    return { redirectUrl: `${returnUrl}?error=auth_failed` };
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function writeSyncLog(
  supabase: any,
  args: {
    workspace_id: string;
    customer_id: string;
    form_id: string;
    lead_id: string;
    status: string;
    error_message?: string;
    payload: Record<string, unknown>;
    crm_lead_id?: string;
  },
) {
  try {
    await supabase
      .schema('core')
      .from('google_ads_sync_logs')
      .insert({
        workspace_id: args.workspace_id,
        customer_id: args.customer_id,
        form_id: args.form_id,
        lead_id: args.lead_id,
        status: args.status,
        error_message: args.error_message ?? null,
        payload: args.payload,
        crm_lead_id: args.crm_lead_id ?? null,
      });
  } catch (e) {
    console.error('[integration-google-ads] Failed to write sync log:', e);
  }
}
