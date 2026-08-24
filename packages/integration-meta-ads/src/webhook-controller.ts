import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  resolveCreatorId,
  resolveDefaultLeadStatusId,
  resolveOrCreateLeadSource,
} from '@kit/integration-website';
import type { Connector } from '@kit/integration-website';

import { fetchMetaLeadData } from './meta-ads-provider';

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
    // console.warn(
    //   `[integration-meta-ads] No active form config for form_id=${form_id}, page_id=${page_id}`,
    // );
    return;
  }

  const { workspace_id, account_id } = formConfig;

  if (!account_id) {
    // console.warn(
    //   '[integration-meta-ads] Form has no account_id, cannot fetch lead data.',
    // );
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
