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

  let leadId = entityType === 'lead' ? entityId : null;
  let accountId = entityType === 'account' ? entityId : null;

  // 1. Resolve Lead ID and Account ID from the current entity
  if (['account', 'contact', 'opportunity'].includes(entityType)) {
    const tableMap: Record<string, string> = {
      account: 'crm_accounts',
      contact: 'crm_contacts',
      opportunity: 'crm_opportunities',
    };
    const tableName = tableMap[entityType];

    const { data: entity } = await supabase
      .from(tableName as any)
      .select('created_from_lead_id, account_id') // Try to get account_id too
      .eq('id', entityId)
      .single() as any;

    if (entity) {
      if (entity.created_from_lead_id) {
        leadId = entity.created_from_lead_id;
        // Add lead to list if not already there
        if (!entityIds.find(e => e.entity_type === 'lead' && e.entity_id === leadId)) {
             entityIds.push({
                entity_type: 'lead',
                entity_id: leadId!,
              });
        }
      }
      if (entity.account_id && !accountId) {
        accountId = entity.account_id;
         if (!entityIds.find(e => e.entity_type === 'account' && e.entity_id === accountId)) {
             entityIds.push({
                entity_type: 'account',
                entity_id: accountId!,
              });
        }
      }
    }
  }

  // 2. If we have a Lead ID, fetch all siblings (Accounts, Contacts, Opportunities created from this lead)
  if (leadId) {
    // Get accounts
    const { data: accounts } = await supabase
      .from('crm_accounts' as any)
      .select('id')
      .eq('created_from_lead_id', leadId)
      .eq('is_deleted', false);
    
    accounts?.forEach((acc) => {
        if (!entityIds.find(e => e.entity_type === 'account' && e.entity_id === acc.id)) {
            entityIds.push({ entity_type: 'account', entity_id: acc.id });
        }
    });

    // Get contacts
    const { data: contacts } = await supabase
      .from('crm_contacts' as any)
      .select('id')
      .eq('created_from_lead_id', leadId)
      .eq('is_deleted', false);
      
    contacts?.forEach((cont) => {
       if (!entityIds.find(e => e.entity_type === 'contact' && e.entity_id === cont.id)) {
            entityIds.push({ entity_type: 'contact', entity_id: cont.id });
        }
    });

    // Get opportunities
    const { data: opportunities } = await supabase
      .from('crm_opportunities' as any)
      .select('id')
      .eq('created_from_lead_id', leadId)
      .eq('is_deleted', false);

    opportunities?.forEach((opp) => {
        if (!entityIds.find(e => e.entity_type === 'opportunity' && e.entity_id === opp.id)) {
            entityIds.push({ entity_type: 'opportunity', entity_id: opp.id });
        }
    });
  }

  // 3. If we have an Account ID (either input or found via relation), fetch its child Contacts and Opportunities
  if (accountId) {
      // Get contacts for this account
      const { data: contacts } = await supabase
      .from('crm_contacts' as any)
      .select('id')
      .eq('account_id', accountId)
      .eq('is_deleted', false);

      contacts?.forEach((cont) => {
        if (!entityIds.find(e => e.entity_type === 'contact' && e.entity_id === cont.id)) {
            entityIds.push({ entity_type: 'contact', entity_id: cont.id });
        }
      });

      // Get opportunities for this account
      const { data: opportunities } = await supabase
      .from('crm_opportunities' as any)
      .select('id')
      .eq('account_id', accountId)
      .eq('is_deleted', false);

       opportunities?.forEach((opp) => {
        if (!entityIds.find(e => e.entity_type === 'opportunity' && e.entity_id === opp.id)) {
            entityIds.push({ entity_type: 'opportunity', entity_id: opp.id });
        }
    });
  }

  return entityIds;
}
