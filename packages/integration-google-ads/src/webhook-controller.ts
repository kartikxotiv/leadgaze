import { NextResponse } from 'next/server';

import {
  resolveCreatorId,
  resolveDefaultLeadStatusId,
  resolveOrCreateLeadSource,
} from '@kit/integration-website';
import type { Connector } from '@kit/integration-website';

import {
  fetchGoogleAdsLeadData,
  refreshGoogleAdsToken,
} from './google-ads-provider';

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
