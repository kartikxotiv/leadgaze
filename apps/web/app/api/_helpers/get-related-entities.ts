import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get all related entity IDs for cross-module activity visibility.
 *
 * Relationship rules:
 * - lead      → accounts, contacts, opportunities created from this lead
 * - account   → lead it was created from (+ that lead's siblings), contacts and
 *               opportunities that belong to this account
 * - contact   → account it belongs to (+ that account's children), lead it was
 *               created from (+ that lead's siblings)
 * - opportunity → account it belongs to (+ that account's children), primary
 *                 contact, lead it was created from (+ that lead's siblings)
 *
 * Deleted entities (is_deleted = true) are excluded from related results.
 * The starting entity itself is always included regardless of is_deleted.
 */
export async function getRelatedEntityIds(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
): Promise<Array<{ entity_type: string; entity_id: string }>> {
  const entityIds: Array<{ entity_type: string; entity_id: string }> = [
    { entity_type: entityType, entity_id: entityId },
  ];

  /** Dedup-safe push */
  const addEntity = (type: string, id: string) => {
    if (!entityIds.find((e) => e.entity_type === type && e.entity_id === id)) {
      entityIds.push({ entity_type: type, entity_id: id });
    }
  };

  /**
   * Expand all non-deleted siblings created from a given lead:
   * accounts, contacts, and opportunities with created_from_lead_id = leadId.
   */
  const expandLeadSiblings = async (leadId: string) => {
    const [accountsRes, contactsRes, opportunitiesRes] = await Promise.all([
      supabase
        .from('crm_accounts' as any)
        .select('id')
        .eq('created_from_lead_id', leadId)
        .eq('is_deleted', false),
      supabase
        .from('crm_contacts' as any)
        .select('id')
        .eq('created_from_lead_id', leadId)
        .eq('is_deleted', false),
      supabase
        .from('crm_opportunities' as any)
        .select('id')
        .eq('created_from_lead_id', leadId)
        .eq('is_deleted', false),
    ]);

    if (accountsRes.error) throw accountsRes.error;
    if (contactsRes.error) throw contactsRes.error;
    if (opportunitiesRes.error) throw opportunitiesRes.error;

    accountsRes.data?.forEach((r) => addEntity('account', r.id));
    contactsRes.data?.forEach((r) => addEntity('contact', r.id));
    opportunitiesRes.data?.forEach((r) => addEntity('opportunity', r.id));
  };

  /**
   * Expand all non-deleted children that belong to a given account:
   * contacts and opportunities with account_id = accountId.
   */
  const expandAccountChildren = async (accountId: string) => {
    const [contactsRes, opportunitiesRes] = await Promise.all([
      supabase
        .from('crm_contacts' as any)
        .select('id')
        .eq('account_id', accountId)
        .eq('is_deleted', false),
      supabase
        .from('crm_opportunities' as any)
        .select('id')
        .eq('account_id', accountId)
        .eq('is_deleted', false),
    ]);

    if (contactsRes.error) throw contactsRes.error;
    if (opportunitiesRes.error) throw opportunitiesRes.error;

    contactsRes.data?.forEach((r) => addEntity('contact', r.id));
    opportunitiesRes.data?.forEach((r) => addEntity('opportunity', r.id));
  };

  // ── Lead ──────────────────────────────────────────────────────────────────
  if (entityType === 'lead') {
    await expandLeadSiblings(entityId);
    return entityIds;
  }

  // ── Account ───────────────────────────────────────────────────────────────
  if (entityType === 'account') {
    const { data: account, error } = await supabase
      .from('crm_accounts' as any)
      .select('created_from_lead_id')
      .eq('id', entityId)
      .single() as any;

    if (error) throw error;

    if (account?.created_from_lead_id) {
      addEntity('lead', account.created_from_lead_id);
      await expandLeadSiblings(account.created_from_lead_id);
    }

    await expandAccountChildren(entityId);
    return entityIds;
  }

  // ── Contact ───────────────────────────────────────────────────────────────
  if (entityType === 'contact') {
    const { data: contact, error } = await supabase
      .from('crm_contacts' as any)
      .select('account_id, created_from_lead_id')
      .eq('id', entityId)
      .single() as any;

    if (error) throw error;

    if (contact?.account_id) {
      addEntity('account', contact.account_id);
      await expandAccountChildren(contact.account_id);
    }

    if (contact?.created_from_lead_id) {
      addEntity('lead', contact.created_from_lead_id);
      await expandLeadSiblings(contact.created_from_lead_id);
    }

    return entityIds;
  }

  // ── Opportunity ───────────────────────────────────────────────────────────
  if (entityType === 'opportunity') {
    const { data: opportunity, error } = await supabase
      .from('crm_opportunities' as any)
      .select('account_id, primary_contact_id, created_from_lead_id')
      .eq('id', entityId)
      .single() as any;

    if (error) throw error;

    if (opportunity?.account_id) {
      addEntity('account', opportunity.account_id);
      await expandAccountChildren(opportunity.account_id);
    }

    if (opportunity?.primary_contact_id) {
      addEntity('contact', opportunity.primary_contact_id);
    }

    if (opportunity?.created_from_lead_id) {
      addEntity('lead', opportunity.created_from_lead_id);
      await expandLeadSiblings(opportunity.created_from_lead_id);
    }

    return entityIds;
  }

  return entityIds;
}
