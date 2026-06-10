import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

export async function findCoreEmailEntityByEmail(
  workspaceId: string,
  email: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const supabase = getSupabaseServerAdminClient();

  const { data: lead } = await supabase
    .from('crm_leads')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', normalizedEmail)
    .eq('is_deleted', false)
    .maybeSingle();

  if (lead) return { id: lead.id, type: 'lead' };

  const { data: contact } = await supabase
    .from('crm_contacts')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('email', normalizedEmail)
    .eq('is_deleted', false)
    .maybeSingle();

  if (contact) return { id: contact.id, type: 'contact' };

  return null;
}
