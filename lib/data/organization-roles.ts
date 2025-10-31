import { supabase } from '../supabase-client';
import type { OrganizationRole } from '../types/database';

export async function getRoleById(roleId: string): Promise<OrganizationRole | null> {
  const { data, error } = await supabase
    .from('organization_roles')
    .select('*')
    .eq('role_id', roleId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getRoleByValue(role: string): Promise<OrganizationRole | null> {
  const { data, error } = await supabase
    .from('organization_roles')
    .select('*')
    .eq('role', role)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getAllRoles(): Promise<OrganizationRole[]> {
  const { data, error } = await supabase
    .from('organization_roles')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function createRole(roleData: Partial<OrganizationRole>): Promise<OrganizationRole> {
  const { data, error } = await supabase
    .from('organization_roles')
    .insert([roleData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateRole(
  roleId: string,
  updates: Partial<OrganizationRole>
): Promise<OrganizationRole> {
  const { data, error } = await supabase
    .from('organization_roles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('role_id', roleId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

