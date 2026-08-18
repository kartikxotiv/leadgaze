/**
 * WhatsApp Lead Matching Engine
 *
 * When an incoming WhatsApp message arrives:
 * 1. Search existing CRM leads/contacts by phone number
 * 2. If found → link conversation to existing record
 * 3. If not found → run lead creation rules based on workspace settings
 *    - automatic: always create a lead
 *    - manual: never auto-create (agent does it manually)
 *    - hybrid: create only if keyword match or message threshold exceeded
 */
import type { SupabaseClient } from '@supabase/supabase-js';

import type { LeadCreationMode, WhatsAppSettings } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeadMatchResult {
  matched: boolean;
  leadId?: string;
  contactId?: string;
  leadCreated: boolean;
}

// ---------------------------------------------------------------------------
// Phone normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a phone number to E.164 format for comparison.
 * Meta sends numbers without the leading + (e.g. "919876543210").
 * CRM stores them in various formats.
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

// ---------------------------------------------------------------------------
// CRM Lookup
// ---------------------------------------------------------------------------

async function findLeadByPhone(
  phone: string,
  workspaceId: string,
  supabase: SupabaseClient,
): Promise<{ id: string } | null> {
  const normalized = normalizePhone(phone);

  // crm_leads is in the public schema
  const { data } = await supabase
    .from('crm_leads')
    .select('id')
    .eq('workspace_id', workspaceId)
    .or(
      `phone_number.ilike.%${normalized}%,mobile_number.ilike.%${normalized}%`,
    )
    .limit(1)
    .maybeSingle();

  return data as { id: string } | null;
}

async function findContactByPhone(
  phone: string,
  workspaceId: string,
  supabase: SupabaseClient,
): Promise<{ id: string } | null> {
  const normalized = normalizePhone(phone);

  // crm_contacts is in the public schema
  const { data } = await supabase
    .from('crm_contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .or(
      `phone_number.ilike.%${normalized}%,mobile_number.ilike.%${normalized}%`,
    )
    .limit(1)
    .maybeSingle();

  return data as { id: string } | null;
}

// ---------------------------------------------------------------------------
// Hybrid rules engine
// ---------------------------------------------------------------------------

function matchesKeyword(messageBody: string, keywords: string[]): boolean {
  const lower = messageBody.toLowerCase();
  return keywords.some((kw) => lower.includes(kw.toLowerCase()));
}

function shouldCreateLeadHybrid(
  message: string,
  messageCount: number,
  settings: WhatsAppSettings,
): boolean {
  // Rule 1: keyword match
  if (matchesKeyword(message, settings.lead_keywords)) return true;
  // Rule 2: message count threshold
  if (messageCount >= settings.lead_message_threshold) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Lead creation
// ---------------------------------------------------------------------------

async function createLeadFromConversation(
  phone: string,
  customerName: string | undefined,
  conversationId: string,
  workspaceId: string,
  createdBy: string | undefined,
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    // crm_leads is in the public schema and requires status_id + source_id FKs

    // 1. Find the leads module id (crm_modules is global, not workspace-scoped)
    const { data: moduleRow } = await supabase
      .from('crm_modules')
      .select('id')
      .eq('module_key', 'leads')
      .maybeSingle();

    // 2. Get statuses for leads module in this workspace
    let statusQuery = supabase
      .from('entity_statuses')
      .select('id, status_key, is_default, sort_order')
      .eq('workspace_id', workspaceId);

    if (moduleRow) {
      statusQuery = statusQuery.eq(
        'module_id',
        (moduleRow as { id: string }).id,
      );
    }

    let { data: statuses } = await statusQuery.order('sort_order', {
      ascending: true,
    });

    // If workspace has no seeded statuses yet, trigger seeding RPC
    if (!statuses || statuses.length === 0) {
      try {
        await supabase.rpc('initialize_workspace_crm_data', {
          p_workspace_id: workspaceId,
        });
      } catch {
        // ignore RPC failure if procedure does not exist
      }
      const retryRes = await statusQuery.order('sort_order', {
        ascending: true,
      });
      statuses = retryRes.data;
    }

    // Find 'new' status, or fall back to is_default, or fall back to first status
    const statusRow =
      statuses?.find((s) => s.status_key === 'new') ||
      statuses?.find((s) => s.is_default) ||
      statuses?.[0];

    if (!statusRow) {
      console.error(
        '[whatsapp] Could not find any lead status for workspace',
        workspaceId,
      );
      return null;
    }

    // 2. Get the 'social_media' source (closest to WhatsApp) — optional, null-safe
    const { data: sourceRow } = await supabase
      .from('lead_sources')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('source_key', 'social_media')
      .maybeSingle();

    // 3. Split customer name into first/last
    const nameParts = (customerName ?? phone).trim().split(' ');
    const firstName = nameParts[0] ?? phone;
    const lastName = nameParts.slice(1).join(' ') || undefined;

    const { data: lead, error } = await supabase
      .from('crm_leads')
      .insert({
        workspace_id: workspaceId,
        first_name: firstName,
        last_name: lastName ?? null,
        phone_number: `+${phone}`,
        status_id: (statusRow as { id: string }).id,
        source_id: sourceRow ? (sourceRow as { id: string }).id : null,
        created_by: createdBy ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error || !lead) {
      console.error(
        '[whatsapp] Failed to create lead from conversation:',
        error,
      );
      return null;
    }

    // Link conversation to the new lead
    await supabase
      .schema('core')
      .from('whatsapp_conversations')
      .update({
        lead_id: (lead as { id: string }).id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    return (lead as { id: string }).id;
  } catch (err) {
    console.error('[whatsapp] Lead creation error:', err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main engine
// ---------------------------------------------------------------------------

/**
 * Match an incoming WhatsApp message sender to an existing CRM lead/contact,
 * or create a new lead depending on workspace lead_creation_mode settings.
 */
export async function matchOrCreateLead(
  params: {
    phone: string;
    customerName?: string;
    messageBody: string;
    conversationId: string;
    messageCount: number;
    workspaceId: string;
    createdBy?: string;
    settings: WhatsAppSettings | null;
  },
  supabase: SupabaseClient,
  hooks?: {
    beforeCreateLead?: (workspaceId: string) => Promise<{
      commit(resourceId: string): Promise<void>;
      rollback(): Promise<void>;
    }>;
  },
): Promise<LeadMatchResult> {
  const {
    phone,
    customerName,
    messageBody,
    conversationId,
    messageCount,
    workspaceId,
    createdBy,
    settings,
  } = params;
  const mode: LeadCreationMode = settings?.lead_creation_mode ?? 'hybrid';

  // 1. Try to find existing lead by phone
  const existingLead = await findLeadByPhone(phone, workspaceId, supabase);
  if (existingLead) {
    await supabase
      .schema('core')
      .from('whatsapp_conversations')
      .update({
        lead_id: existingLead.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
    return { matched: true, leadId: existingLead.id, leadCreated: false };
  }

  // 2. Try to find existing contact by phone
  const existingContact = await findContactByPhone(
    phone,
    workspaceId,
    supabase,
  );
  if (existingContact) {
    await supabase
      .schema('core')
      .from('whatsapp_conversations')
      .update({
        contact_id: existingContact.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
    return { matched: true, contactId: existingContact.id, leadCreated: false };
  }

  // 3. No match — run lead creation rules
  if (mode === 'manual') {
    // Never auto-create; agent does it manually
    return { matched: false, leadCreated: false };
  }

  if (mode === 'automatic') {
    const reservation = await hooks?.beforeCreateLead?.(workspaceId);
    const leadId = await createLeadFromConversation(
      phone,
      customerName,
      conversationId,
      workspaceId,
      createdBy,
      supabase,
    );
    if (leadId) await reservation?.commit(leadId);
    else await reservation?.rollback();
    return {
      matched: false,
      leadCreated: !!leadId,
      leadId: leadId ?? undefined,
    };
  }

  // hybrid
  if (settings && shouldCreateLeadHybrid(messageBody, messageCount, settings)) {
    const reservation = await hooks?.beforeCreateLead?.(workspaceId);
    const leadId = await createLeadFromConversation(
      phone,
      customerName,
      conversationId,
      workspaceId,
      createdBy,
      supabase,
    );
    if (leadId) await reservation?.commit(leadId);
    else await reservation?.rollback();
    return {
      matched: false,
      leadCreated: !!leadId,
      leadId: leadId ?? undefined,
    };
  }

  return { matched: false, leadCreated: false };
}
