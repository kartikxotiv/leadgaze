import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get all related entity IDs for notes/meetings/reminders/documents
 * If viewing account/contact/opportunity, includes the lead it was created from
 * If viewing lead, includes all accounts/contacts/opportunities created from it
 */
export async function getRelatedEntityIds(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
): Promise<Array<{ entity_type: string; entity_id: string }>> {
  const entityIds: Array<{ entity_type: string; entity_id: string }> = [
    { entity_type: entityType, entity_id: entityId },
  ];

  // If viewing account/contact/opportunity, also get the lead it was created from
  if (['account', 'contact', 'opportunity'].includes(entityType)) {
    const tableMap: Record<string, string> = {
      account: 'crm_accounts',
      contact: 'crm_contacts',
      opportunity: 'crm_opportunities',
    };
    const tableName = tableMap[entityType];

    const { data: entity } = await supabase
      .from(tableName as any)
      .select('created_from_lead_id')
      .eq('id', entityId)
      .single();

    if (entity?.created_from_lead_id) {
      entityIds.push({
        entity_type: 'lead',
        entity_id: entity.created_from_lead_id,
      });
    }
  }

  // If viewing lead, also get accounts/contacts/opportunities created from this lead
  if (entityType === 'lead') {
    // Get accounts created from this lead
    const { data: accounts } = await supabase
      .from('crm_accounts' as any)
      .select('id')
      .eq('created_from_lead_id', entityId)
      .eq('is_deleted', false);

    if (accounts) {
      accounts.forEach((acc) => {
        entityIds.push({ entity_type: 'account', entity_id: acc.id });
      });
    }

    // Get contacts created from this lead
    const { data: contacts } = await supabase
      .from('crm_contacts' as any)
      .select('id')
      .eq('created_from_lead_id', entityId)
      .eq('is_deleted', false);

    if (contacts) {
      contacts.forEach((contact) => {
        entityIds.push({ entity_type: 'contact', entity_id: contact.id });
      });
    }

    // Get opportunities created from this lead
    const { data: opportunities } = await supabase
      .from('crm_opportunities' as any)
      .select('id')
      .eq('created_from_lead_id', entityId)
      .eq('is_deleted', false);

    if (opportunities) {
      opportunities.forEach((opp) => {
        entityIds.push({ entity_type: 'opportunity', entity_id: opp.id });
      });
    }
  }

  return entityIds;
}
