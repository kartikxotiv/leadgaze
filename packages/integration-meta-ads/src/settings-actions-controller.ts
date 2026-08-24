import { NextResponse } from 'next/server';

import {
  buildMetaAdsOAuthUrl,
  fetchMetaLeadForms,
  fetchMetaPages,
  isMetaTokenExpiringSoon,
  subscribePageToApp,
} from './meta-ads-provider';

export async function handleMutateMetaAdsSettings(
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
        body.pageAccountId as string,
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
        body.mappings as Array<{ meta_field: string; leadgaze_field: string }>,
        supabase,
      );

    case 'fetch-pages':
      return handleFetchPages(workspaceId, supabase);

    case 'fetch-lead-forms':
      return handleFetchLeadForms(
        workspaceId,
        body.pageAccountId as string,
        supabase,
      );

    case 'subscribe-page':
      return handleSubscribePage(
        workspaceId,
        body.pageAccountId as string,
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
// ---------------------------------------------------------------------------

function handleGetAuthUrl(workspaceId: string, userId: string): NextResponse {
  const state = Buffer.from(
    JSON.stringify({
      workspaceId,
      userId,
      returnUrl: `/home/sales/workspace-settings/integrations/meta-ads`,
    }),
  ).toString('base64');

  const url = buildMetaAdsOAuthUrl(state);
  return NextResponse.json({ success: true, data: { url } });
}

// ---------------------------------------------------------------------------
// disconnect — removes a single Facebook Page account
// ---------------------------------------------------------------------------

async function handleDisconnect(
  workspaceId: string,
  pageAccountId: string,
  userId: string,
  supabase: any,
): Promise<NextResponse> {
  if (!pageAccountId) {
    return NextResponse.json(
      { success: false, message: 'pageAccountId is required to disconnect.' },
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
    .eq('id', pageAccountId)
    .eq('workspace_id', workspaceId);

  if (error) {
    console.error('[integration-meta-ads] Failed to disconnect page:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to disconnect Facebook page.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data: null });
}

// ---------------------------------------------------------------------------
// fetch-pages — refreshes the list of Pages from the Meta Graph API
// ---------------------------------------------------------------------------

async function handleFetchPages(
  workspaceId: string,
  supabase: any,
): Promise<NextResponse> {
  const { data: conn } = await supabase
    .schema('core')
    .from('integration_connections')
    .select('id, config')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'meta_ads')
    .eq('is_deleted', false)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json(
      { success: false, message: 'No active Meta Ads connection found.' },
      { status: 404 },
    );
  }

  const { user_access_token, token_expires_at } = conn.config as {
    user_access_token?: string;
    token_expires_at?: number;
  };

  if (!user_access_token) {
    return NextResponse.json(
      {
        success: false,
        message: 'Access token unavailable. Please reconnect.',
      },
      { status: 401 },
    );
  }

  if (token_expires_at && isMetaTokenExpiringSoon(token_expires_at)) {
    console.warn(
      '[integration-meta-ads] Meta token is expiring soon for workspace:',
      workspaceId,
    );
  }

  try {
    const pages = await fetchMetaPages(user_access_token);
    return NextResponse.json({ success: true, data: { pages } });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to fetch pages.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// fetch-lead-forms — fetches lead forms for a specific page
// ---------------------------------------------------------------------------

async function handleFetchLeadForms(
  workspaceId: string,
  pageAccountId: string,
  supabase: any,
): Promise<NextResponse> {
  if (!pageAccountId) {
    return NextResponse.json(
      { success: false, message: 'pageAccountId is required.' },
      { status: 400 },
    );
  }

  const { data: account } = await supabase
    .schema('core')
    .from('integration_accounts')
    .select('id, metadata')
    .eq('id', pageAccountId)
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!account?.metadata?.page_access_token) {
    return NextResponse.json(
      { success: false, message: 'Page access token not found.' },
      { status: 404 },
    );
  }

  const { page_id, page_access_token } = account.metadata as {
    page_id: string;
    page_access_token: string;
  };

  try {
    const forms = await fetchMetaLeadForms(page_id, page_access_token);
    return NextResponse.json({ success: true, data: { forms } });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to fetch lead forms.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// subscribe-page — subscribes a page to the Meta app for lead webhooks
// ---------------------------------------------------------------------------

async function handleSubscribePage(
  workspaceId: string,
  pageAccountId: string,
  supabase: any,
): Promise<NextResponse> {
  if (!pageAccountId) {
    return NextResponse.json(
      { success: false, message: 'pageAccountId is required.' },
      { status: 400 },
    );
  }

  const { data: account } = await supabase
    .schema('core')
    .from('integration_accounts')
    .select('id, metadata')
    .eq('id', pageAccountId)
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .maybeSingle();

  if (!account?.metadata?.page_access_token) {
    return NextResponse.json(
      { success: false, message: 'Page access token not found.' },
      { status: 404 },
    );
  }

  const { page_id, page_access_token } = account.metadata as {
    page_id: string;
    page_access_token: string;
  };

  try {
    await subscribePageToApp(page_id, page_access_token);
    return NextResponse.json({ success: true, data: { subscribed: true } });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Failed to subscribe page.';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// save-forms
// ---------------------------------------------------------------------------

async function handleSaveForms(
  workspaceId: string,
  forms: Array<{
    connection_id: string;
    account_id?: string;
    business_id?: string;
    business_name?: string;
    page_id: string;
    page_name?: string;
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
    account_id: f.account_id ?? null,
    business_id: f.business_id ?? null,
    business_name: f.business_name ?? null,
    page_id: f.page_id,
    page_name: f.page_name ?? null,
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
    .from('meta_ads_forms')
    .upsert(rows, { onConflict: 'workspace_id,form_id' })
    .select();

  if (error) {
    console.error('[integration-meta-ads] Failed to save forms:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to save form configuration.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, data });
}

// ---------------------------------------------------------------------------
// save-field-mappings
// ---------------------------------------------------------------------------

async function handleSaveFieldMappings(
  workspaceId: string,
  formId: string,
  mappings: Array<{ meta_field: string; leadgaze_field: string }>,
  supabase: any,
): Promise<NextResponse> {
  if (!formId) {
    return NextResponse.json(
      { success: false, message: 'form_id is required.' },
      { status: 400 },
    );
  }

  await supabase
    .schema('core')
    .from('meta_ads_field_mappings')
    .delete()
    .eq('form_id', formId)
    .eq('workspace_id', workspaceId);

  if (!Array.isArray(mappings) || mappings.length === 0) {
    return NextResponse.json({ success: true, data: [] });
  }

  const rows = mappings.map((m) => ({
    workspace_id: workspaceId,
    form_id: formId,
    meta_field: m.meta_field,
    leadgaze_field: m.leadgaze_field,
  }));

  const { data, error } = await supabase
    .schema('core')
    .from('meta_ads_field_mappings')
    .insert(rows)
    .select();

  if (error) {
    console.error(
      '[integration-meta-ads] Failed to save field mappings:',
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
// Webhook handler
// ---------------------------------------------------------------------------

/**
 * GET /api/integrations/meta/webhook
 * Meta webhook verification challenge.
 */
