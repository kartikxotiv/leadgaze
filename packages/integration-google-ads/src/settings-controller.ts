import { NextResponse } from 'next/server';

import {
  buildGoogleAdsOAuthUrl,
  getGoogleAdsCustomerAccounts,
  refreshGoogleAdsToken,
} from './google-ads-provider';
import type { GoogleAdsSettingsData } from './types';

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
