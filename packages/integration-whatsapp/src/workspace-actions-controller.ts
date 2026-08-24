import { NextResponse } from 'next/server';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { LeadCreationMode } from './types';
import { getWabaTemplates } from './whatsapp-provider';

export async function handleUpdateSettings(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { leadCreationMode, leadKeywords, leadMessageThreshold } = body as {
    leadCreationMode?: LeadCreationMode;
    leadKeywords?: string[];
    leadMessageThreshold?: number;
  };

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (leadCreationMode) update.lead_creation_mode = leadCreationMode;
  if (leadKeywords) update.lead_keywords = leadKeywords;
  if (leadMessageThreshold !== undefined)
    update.lead_message_threshold = leadMessageThreshold;

  await supabase
    .schema('core')
    .from('whatsapp_settings')
    .upsert(
      { workspace_id: workspaceId, ...update },
      { onConflict: 'workspace_id' },
    );

  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// sync-templates
// ---------------------------------------------------------------------------

export async function handleSyncTemplates(
  workspaceId: string,
  accountId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { data: account } = await supabase
    .schema('core')
    .from('integration_accounts')
    .select('metadata')
    .eq('id', accountId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!account) {
    return NextResponse.json(
      { success: false, message: 'Account not found' },
      { status: 404 },
    );
  }

  const meta = (account as { metadata: Record<string, string> }).metadata;
  const wabaId = meta.waba_id as string;
  const accessToken = meta.access_token as string;

  try {
    const templates = await getWabaTemplates(wabaId, accessToken);

    // Upsert all templates
    for (const t of templates) {
      await supabase
        .schema('core')
        .from('whatsapp_templates')
        .upsert(
          {
            workspace_id: workspaceId,
            account_id: accountId,
            meta_template_id: t.meta_template_id ?? '',
            template_name: t.template_name ?? '',
            language: t.language ?? 'en_US',
            category: t.category ?? 'MARKETING',
            template_payload: t.template_payload,
            status: t.status ?? 'PENDING',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'workspace_id,account_id,meta_template_id' },
        );
    }

    return NextResponse.json({
      success: true,
      data: { synced: templates.length },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: (err as Error).message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// convert-to-lead (manual one-click from inbox)
// ---------------------------------------------------------------------------

export async function handleConvertToLead(
  workspaceId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  userId: string,
  supabase: SupabaseClient,
): Promise<NextResponse> {
  const { conversationId } = body as { conversationId: string };

  const { data: conv } = await supabase
    .schema('core')
    .from('whatsapp_conversations')
    .select('customer_phone, customer_name, lead_id')
    .eq('id', conversationId)
    .eq('workspace_id', workspaceId)
    .single();

  if (!conv) {
    return NextResponse.json(
      { success: false, message: 'Conversation not found' },
      { status: 404 },
    );
  }

  const c = conv as {
    customer_phone: string;
    customer_name?: string;
    lead_id?: string;
  };

  if (c.lead_id) {
    return NextResponse.json(
      { success: false, message: 'Conversation is already linked to a lead' },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  // Look up the leads module id for scoped status lookup
  const { data: moduleRow } = await supabase
    .from('crm_modules')
    .select('id')
    .eq('module_key', 'leads')
    .maybeSingle();

  // Get status for leads module in this workspace
  let statusQuery = supabase
    .from('entity_statuses')
    .select('id, status_key, is_default, sort_order')
    .eq('workspace_id', workspaceId);

  if (moduleRow)
    statusQuery = statusQuery.eq('module_id', (moduleRow as { id: string }).id);

  let { data: statuses } = await statusQuery.order('sort_order', {
    ascending: true,
  });

  if (!statuses || statuses.length === 0) {
    try {
      await supabase.rpc('initialize_workspace_crm_data', {
        p_workspace_id: workspaceId,
      });
    } catch {
      // ignore RPC failure
    }
    const retryRes = await statusQuery.order('sort_order', { ascending: true });
    statuses = retryRes.data;
  }

  const statusRow =
    statuses?.find((s) => s.status_key === 'new') ||
    statuses?.find((s) => s.is_default) ||
    statuses?.[0];

  if (!statusRow) {
    return NextResponse.json(
      { success: false, message: 'Could not find lead status for workspace' },
      { status: 500 },
    );
  }

  // Get 'social_media' source id (WhatsApp) — optional
  const { data: sourceRow } = await supabase
    .from('lead_sources')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('source_key', 'social_media')
    .maybeSingle();

  // Split customer name into first/last
  const nameParts = (c.customer_name ?? c.customer_phone).trim().split(' ');
  const firstName = nameParts[0] ?? c.customer_phone;
  const lastName = nameParts.slice(1).join(' ') || null;

  // crm_leads is in the public schema
  const { data: lead, error } = await supabase
    .from('crm_leads')
    .insert({
      workspace_id: workspaceId,
      first_name: firstName,
      last_name: lastName,
      phone_number: `+${c.customer_phone}`,
      status_id: (statusRow as { id: string }).id,
      source_id: sourceRow ? (sourceRow as { id: string }).id : null,
      created_by: userId,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (error || !lead) {
    return NextResponse.json(
      { success: false, message: error?.message ?? 'Lead creation failed' },
      { status: 500 },
    );
  }

  await supabase
    .schema('core')
    .from('whatsapp_conversations')
    .update({ lead_id: (lead as { id: string }).id, updated_at: now })
    .eq('id', conversationId);

  return NextResponse.json({
    success: true,
    data: { leadId: (lead as { id: string }).id },
  });
}

// ---------------------------------------------------------------------------
// Conversation list
// ---------------------------------------------------------------------------
