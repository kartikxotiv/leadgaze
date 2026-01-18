import { supabase } from '../supabase-client';
import type { OrganizationWorkspace } from '../types/database';

export async function getWorkspaceById(workspaceId: string): Promise<OrganizationWorkspace | null> {
  const { data, error } = await supabase
    .from('organization_workspaces')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getWorkspacesByOrganization(organizationId: string): Promise<OrganizationWorkspace[]> {
  const { data, error } = await supabase
    .from('organization_workspaces')
    .select(`
      *,
      creator:users!organization_workspaces_created_by_fkey(user_id, email, first_name, last_name)
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createWorkspace(workspaceData: Partial<OrganizationWorkspace>): Promise<OrganizationWorkspace> {
  const { data, error } = await supabase
    .from('organization_workspaces')
    .insert([workspaceData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<OrganizationWorkspace>
): Promise<OrganizationWorkspace> {
  const { data, error } = await supabase
    .from('organization_workspaces')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  const { error } = await supabase
    .from('organization_workspaces')
    .delete()
    .eq('workspace_id', workspaceId);
  
  if (error) throw error;
  return true;
}

export async function countWorkspacesByOrganization(organizationId: string): Promise<number> {
  const { count, error } = await supabase
    .from('organization_workspaces')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);
  
  if (error) throw error;
  return count || 0;
}

