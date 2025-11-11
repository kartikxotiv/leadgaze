import { supabase } from '../supabase-client';
import type { WorkspaceRole as WorkspaceRoleType } from '../types/database';
// import type { WorkspaceRoleWithRelations } from '../types/database';
import { paginateQuery, buildSearchQuery, buildWhereFilters, PaginationResult } from '../utils/supabase-queries';


export async function createWorkspaceRole(input: Partial<WorkspaceRoleType>): Promise<WorkspaceRoleType> {
  const { data, error } = await supabase
    .from('workspace_roles')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkspaceRole(id: string, input: Partial<WorkspaceRoleType>): Promise<WorkspaceRoleType> {
  const { data, error } = await supabase
    .from('workspace_roles')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkspaceRole(id: string): Promise<WorkspaceRoleType | null> {
  const { data, error } = await supabase
    .from('workspace_roles')
    .update({ is_deleted: true })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getWorkspaceRoleById(id: string): Promise<WorkspaceRoleType | null> {
  const { data, error } = await supabase
    .from('workspace_roles')
    .select('*')
    .eq('id', id)
    .eq('is_deleted', false)
    .single();
  if (error) {
    // If no rows found, return null instead of throwing
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }
  return data;
}

export async function getWorkspaceRoles(workspaceId: string): Promise<WorkspaceRoleType[]> {
  const { data, error } = await supabase
    .from('workspace_roles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getWorkspaceRolesPaginated(workspaceId: string, page: number, limit: number, filters?: Record<string, any>, search?: string): Promise<PaginationResult<WorkspaceRoleType>> {
  let query = supabase
    .from('workspace_roles')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false);
  
  if (filters) {
    query = buildWhereFilters(query, filters);
  }
  if (search) {
    query = buildSearchQuery(query, search, ['name', 'description']);
  }
  query = query.order('created_at', { ascending: false });
  return paginateQuery(query, { page, limit });
}