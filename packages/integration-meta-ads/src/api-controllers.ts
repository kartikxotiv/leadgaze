/**
 * Meta Ads API Controllers
 *
 * All route handler logic for the Meta Ads Lead Forms integration.
 * Called from apps/web/app/api routes.
 * Follows the same patterns as @kit/integration-google-ads.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  resolveCreatorId,
  resolveDefaultLeadStatusId,
  resolveOrCreateLeadSource,
} from '@kit/integration-website';
import type { Connector } from '@kit/integration-website';

import {
  buildMetaAdsOAuthUrl,
  exchangeMetaAdsCode,
  fetchMetaBusinesses,
  fetchMetaLeadData,
  fetchMetaLeadForms,
  fetchMetaPages,
  isMetaTokenExpiringSoon,
  subscribePageToApp,
} from './meta-ads-provider';
import type { MetaAdsSettingsData } from './types';

// ---------------------------------------------------------------------------
// GET /api/workspaces/[id]/meta-ads
// ---------------------------------------------------------------------------

export async function handleGetMetaAdsSettings(
  workspaceId: string,
  supabase: any,
): Promise<NextResponse> {
  // 1. Fetch parent connection first (needed to scope pages query)
  const { data: connectionData } = await supabase
    .schema('core')
    .from('integration_connections')
    .select('id, status, config, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('provider', 'meta_ads')
    .eq('is_deleted', false)
    .maybeSingle();

  const connectionId =
    connectionData?.id ?? '00000000-0000-0000-0000-000000000000';

  const [pagesResult, formsResult, logsResult] = await Promise.all([
    supabase
      .schema('core')
      .from('integration_accounts')
      .select(
        'id, external_account_id, display_name, email, metadata, status, created_at, updated_at',
      )
      .eq('workspace_id', workspaceId)
      .eq('connection_id', connectionId)
      .eq('is_deleted', false),

    supabase
      .schema('core')
      .from('meta_ads_forms')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false }),

    supabase
      .schema('core')
      .from('meta_ads_sync_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const connection = connectionData
    ? { ...connectionData, workspace_id: workspaceId, provider: 'meta_ads' }
    : null;

  // Fetch field mappings for all configured forms
  let mappings: unknown[] = [];
  const forms = formsResult.data ?? [];
  if (forms.length > 0) {
    const formIds = forms.map((f: { id: string }) => f.id);
    const { data: mappingData } = await supabase
      .schema('core')
      .from('meta_ads_field_mappings')
      .select('*')
      .in('form_id', formIds);
    mappings = mappingData ?? [];
  }

  const payload: MetaAdsSettingsData = {
    connection,
    pages: pagesResult.data ?? [],
    forms,
    mappings: mappings as any[],
    recentLogs: logsResult.data ?? [],
  };

  return NextResponse.json({ success: true, data: payload });
}

// ---------------------------------------------------------------------------
// POST /api/workspaces/[id]/meta-ads — action dispatcher
// ---------------------------------------------------------------------------

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
export function handleMetaAdsWebhookVerification(
  request: NextRequest,
): NextResponse {
  const { searchParams } = request.nextUrl;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json(
      { success: false, message: 'META_WEBHOOK_VERIFY_TOKEN not configured.' },
      { status: 500 },
    );
  }

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json(
    { success: false, message: 'Webhook verification failed.' },
    { status: 403 },
  );
}

/**
 * POST /api/integrations/meta/webhook
 * Receives leadgen events from Meta. Always returns 200 immediately.
 * Processes leads inline (no queue — same approach as Google Ads webhook).
 */
export async function handleMetaAdsWebhook(
  payload: {
    object?: string;
    entry?: Array<{
      id: string;
      changes?: Array<{
        field: string;
        value: {
          leadgen_id: string;
          page_id: string;
          form_id: string;
          adgroup_id?: string;
          ad_id?: string;
        };
      }>;
    }>;
  },
  supabase: any,
  hooks?: {
    beforeCreateLead?: (workspaceId: string) => Promise<{
      commit(resourceId: string): Promise<void>;
      rollback(): Promise<void>;
    }>;
  },
): Promise<NextResponse> {
  if (payload.object !== 'page') {
    return NextResponse.json({
      success: true,
      message: 'Not a page event. Skipped.',
    });
  }

  const entries = payload.entry ?? [];

  // Process each entry (each is a page event)
  for (const entry of entries) {
    const changes = (entry.changes ?? []).filter((c) => c.field === 'leadgen');

    for (const change of changes) {
      const { leadgen_id, page_id, form_id } = change.value;

      if (!leadgen_id || !page_id || !form_id) continue;

      // Run async — don't block 200 response (fire and forget per entry)
      processMetaLead({ leadgen_id, page_id, form_id }, supabase, hooks).catch(
        (e) => {
          console.error(
            '[integration-meta-ads] Background lead processing failed:',
            e,
          );
        },
      );
    }
  }

  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// Internal: process a single lead from Meta webhook
// ---------------------------------------------------------------------------

async function processMetaLead(
  event: { leadgen_id: string; page_id: string; form_id: string },
  supabase: any,
  hooks?: {
    beforeCreateLead?: (workspaceId: string) => Promise<{
      commit(resourceId: string): Promise<void>;
      rollback(): Promise<void>;
    }>;
  },
): Promise<void> {
  const { leadgen_id, page_id, form_id } = event;

  // 1. Find the configured form
  const { data: formConfig } = await supabase
    .schema('core')
    .from('meta_ads_forms')
    .select('*')
    .eq('form_id', form_id)
    .eq('page_id', page_id)
    .eq('is_active', true)
    .maybeSingle();

  if (!formConfig) {
    console.warn(
      `[integration-meta-ads] No active form config for form_id=${form_id}, page_id=${page_id}`,
    );
    return;
  }

  const { workspace_id, account_id } = formConfig;

  if (!account_id) {
    console.warn(
      '[integration-meta-ads] Form has no account_id, cannot fetch lead data.',
    );
    return;
  }

  // 2. Get Page Access Token
  const { data: account } = await supabase
    .schema('core')
    .from('integration_accounts')
    .select('metadata')
    .eq('id', account_id)
    .eq('is_deleted', false)
    .maybeSingle();

  const pageAccessToken: string | undefined =
    account?.metadata?.page_access_token;

  if (!pageAccessToken) {
    await writeSyncLog(supabase, {
      workspace_id,
      page_id,
      form_id,
      leadgen_id,
      status: 'failed',
      error_message:
        'Page access token not found. Page may have been disconnected.',
      payload: event,
    });
    return;
  }

  // 3. Fetch lead data from Meta Graph API
  let rawLeadData: Record<string, string> = {};
  try {
    rawLeadData = await fetchMetaLeadData(leadgen_id, pageAccessToken);
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : 'Failed to fetch lead data.';
    console.error('[integration-meta-ads] Lead data fetch failed:', e);
    await writeSyncLog(supabase, {
      workspace_id,
      page_id,
      form_id,
      leadgen_id,
      status: 'failed',
      error_message: errorMessage,
      payload: event,
    });
    return;
  }

  // 4. Load field mappings
  const { data: mappings } = await supabase
    .schema('core')
    .from('meta_ads_field_mappings')
    .select('meta_field, leadgaze_field')
    .eq('form_id', formConfig.id)
    .eq('workspace_id', workspace_id);

  const mappingMap: Record<string, string> = {};
  for (const m of mappings ?? []) {
    mappingMap[m.meta_field] = m.leadgaze_field;
  }

  const DEFAULT_MAPPINGS: Record<string, string> = {
    full_name: 'name',
    email: 'email',
    phone_number: 'phone_number',
    company_name: 'company_name',
    job_title: 'designation',
    city: 'city',
  };

  const effectiveMappings =
    Object.keys(mappingMap).length > 0 ? mappingMap : DEFAULT_MAPPINGS;
  const normalizedPayload: Record<string, string> = {};

  for (const [metaField, value] of Object.entries(rawLeadData)) {
    const leadgazeField = effectiveMappings[metaField];
    if (leadgazeField) normalizedPayload[leadgazeField] = value;
  }

  // Expand full name into first/last
  if (normalizedPayload.name && !normalizedPayload.first_name) {
    const parts = normalizedPayload.name.trim().split(/\s+/);
    normalizedPayload.first_name = parts[0] ?? '';
    normalizedPayload.last_name = parts.slice(1).join(' ') || 'Meta Lead';
  }

  // 5. Duplicate detection (email OR phone)
  let existingLeadId: string | null = null;

  if (normalizedPayload.email) {
    const { data: byEmail } = await supabase
      .from('crm_leads')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('email', normalizedPayload.email)
      .maybeSingle();
    if (byEmail) existingLeadId = byEmail.id;
  }

  if (!existingLeadId && normalizedPayload.phone_number) {
    const { data: byPhone } = await supabase
      .from('crm_leads')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('phone_number', normalizedPayload.phone_number)
      .maybeSingle();
    if (byPhone) existingLeadId = byPhone.id;
  }

  if (existingLeadId) {
    await writeSyncLog(supabase, {
      workspace_id,
      page_id,
      form_id,
      leadgen_id,
      status: 'duplicate',
      error_message: `Existing CRM lead found: ${existingLeadId}`,
      payload: { ...event, rawLeadData },
      crm_lead_id: existingLeadId,
    });
    return;
  }

  // 6. Reserve capacity, then create the CRM lead. Failed inserts compensate
  // the reservation so webhook retries cannot drift the usage counter.
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
      `meta_ads_${form_id}`,
      `Meta Ads: ${formConfig.form_name}`,
      creatorId,
    );

    const { data: newLead, error: leadError } = await supabase
      .from('crm_leads')
      .insert({
        workspace_id,
        first_name: normalizedPayload.first_name || 'Meta',
        last_name: normalizedPayload.last_name || 'Ads Lead',
        email: normalizedPayload.email || null,
        phone_number: normalizedPayload.phone_number || null,
        company_name: normalizedPayload.company_name || null,
        notes: [
          `Lead from Meta Ads form: ${formConfig.form_name}`,
          `Page: ${formConfig.page_name ?? page_id}`,
          `Leadgen ID: ${leadgen_id}`,
        ].join('\n'),
        owner_id: formConfig.default_owner_id || null,
        status_id: statusId,
        created_by: creatorId,
        source_id: leadSourceId,
      })
      .select()
      .single();

    if (leadError) throw leadError;

    await reservation?.commit(newLead.id);

    await writeSyncLog(supabase, {
      workspace_id,
      page_id,
      form_id,
      leadgen_id,
      status: 'success',
      payload: { ...event, rawLeadData },
      crm_lead_id: newLead.id,
    });
  } catch (e) {
    await reservation?.rollback();
    const errorMessage =
      e instanceof Error ? e.message : 'CRM lead creation failed.';
    console.error('[integration-meta-ads] Lead creation failed:', e);
    await writeSyncLog(supabase, {
      workspace_id,
      page_id,
      form_id,
      leadgen_id,
      status: 'failed',
      error_message: errorMessage,
      payload: { ...event, rawLeadData },
    });
  }
}

// ---------------------------------------------------------------------------
// OAuth Callback handler
// ---------------------------------------------------------------------------

export async function handleMetaAdsCallback(
  code: string,
  rawState: string,
  supabase: any,
): Promise<{ redirectUrl: string }> {
  let workspaceId = '';
  let userId = '';
  let returnUrl = '/home/sales/workspace-settings/integrations/meta-ads';

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
    const tokens = await exchangeMetaAdsCode(code);

    // 1. Get or create parent connection record
    let connectionId = '';
    const { data: existingConn } = await supabase
      .schema('core')
      .from('integration_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'meta_ads')
      .eq('is_deleted', false)
      .maybeSingle();

    if (existingConn) {
      connectionId = existingConn.id;

      // Update the token on the parent connection
      await supabase
        .schema('core')
        .from('integration_connections')
        .update({
          status: 'active',
          config: {
            user_access_token: tokens.user_access_token,
            token_expires_at: tokens.token_expires_at,
            user_id: tokens.user_id,
            user_name: tokens.user_name,
          },
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);
    } else {
      const { data: newConn, error: connErr } = await supabase
        .schema('core')
        .from('integration_connections')
        .insert({
          workspace_id: workspaceId,
          provider: 'meta_ads',
          status: 'active',
          config: {
            user_access_token: tokens.user_access_token,
            token_expires_at: tokens.token_expires_at,
            user_id: tokens.user_id,
            user_name: tokens.user_name,
          },
          is_deleted: false,
          created_by: userId,
          updated_by: userId,
        })
        .select('id')
        .single();

      if (connErr || !newConn) {
        console.error(
          '[integration-meta-ads] Failed to create connection:',
          connErr,
        );
        return { redirectUrl: `${returnUrl}?error=db_error` };
      }
      connectionId = newConn.id;
    }

    // 2. Fetch all pages and store them as integration_accounts
    let pages: Awaited<ReturnType<typeof fetchMetaPages>> = [];
    try {
      pages = await fetchMetaPages(tokens.user_access_token);
    } catch (e) {
      console.warn(
        '[integration-meta-ads] Could not fetch pages on connect:',
        e,
      );
    }

    // Fetch businesses too (non-fatal)
    let businesses: Awaited<ReturnType<typeof fetchMetaBusinesses>> = [];
    try {
      businesses = await fetchMetaBusinesses(tokens.user_access_token);
    } catch {
      // non-fatal
    }

    // 3. Upsert one integration_account per page
    for (const page of pages) {
      // Check if this page is already connected
      const { data: existingPage } = await supabase
        .schema('core')
        .from('integration_accounts')
        .select('id')
        .eq('connection_id', connectionId)
        .eq('external_account_id', page.page_id)
        .eq('is_deleted', false)
        .maybeSingle();

      const metadata = {
        page_id: page.page_id,
        page_name: page.page_name,
        page_access_token: page.page_access_token,
        category: page.category,
        businesses,
      };

      if (existingPage) {
        await supabase
          .schema('core')
          .from('integration_accounts')
          .update({
            metadata,
            status: 'active',
            display_name: page.page_name,
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPage.id);
      } else {
        await supabase.schema('core').from('integration_accounts').insert({
          workspace_id: workspaceId,
          connection_id: connectionId,
          external_account_id: page.page_id,
          display_name: page.page_name,
          email: null,
          metadata,
          status: 'active',
          owner_user_id: userId,
          access_scope: 'workspace',
          created_by: userId,
          updated_by: userId,
        });
      }

      // Auto-subscribe page to receive lead notifications
      try {
        await subscribePageToApp(page.page_id, page.page_access_token);
      } catch (e) {
        console.warn(
          `[integration-meta-ads] Auto-subscribe failed for page ${page.page_id}:`,
          e,
        );
      }
    }

    return { redirectUrl: `${returnUrl}?connected=true` };
  } catch (e) {
    console.error('[integration-meta-ads] OAuth callback failed:', e);
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
    page_id: string;
    form_id: string;
    leadgen_id: string;
    status: string;
    error_message?: string;
    payload: Record<string, unknown>;
    crm_lead_id?: string;
  },
) {
  try {
    await supabase
      .schema('core')
      .from('meta_ads_sync_logs')
      .insert({
        workspace_id: args.workspace_id,
        page_id: args.page_id,
        form_id: args.form_id,
        leadgen_id: args.leadgen_id,
        status: args.status,
        error_message: args.error_message ?? null,
        payload: args.payload,
        crm_lead_id: args.crm_lead_id ?? null,
      });
  } catch (e) {
    console.error('[integration-meta-ads] Failed to write sync log:', e);
  }
}
