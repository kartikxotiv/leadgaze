import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Get entity name based on entity type and ID
 */
export async function getEntityName(
  supabase: SupabaseClient,
  entityType: string,
  entityId: string,
): Promise<string | null> {
  try {
    switch (entityType) {
      case 'lead': {
        const { data } = await supabase
          .from('crm_leads' as any)
          .select('first_name, last_name, company_name')
          .eq('id', entityId)
          .single();
        if (data) {
          if (data.company_name) return data.company_name;
          return `${data.first_name || ''} ${data.last_name || ''}`.trim() || null;
        }
        break;
      }
      case 'account': {
        const { data } = await supabase
          .from('crm_accounts' as any)
          .select('account_name')
          .eq('id', entityId)
          .single();
        return data?.account_name || null;
      }
      case 'contact': {
        const { data } = await supabase
          .from('crm_contacts' as any)
          .select('first_name, last_name')
          .eq('id', entityId)
          .single();
        if (data) {
          return `${data.first_name || ''} ${data.last_name || ''}`.trim() || null;
        }
        break;
      }
      case 'opportunity': {
        const { data } = await supabase
          .from('crm_opportunities' as any)
          .select('opportunity_name')
          .eq('id', entityId)
          .single();
        return data?.opportunity_name || null;
      }
    }
  } catch (error) {
    console.error(`Error fetching entity name for ${entityType}:${entityId}`, error);
  }
  return null;
}
