import { supabase } from '../supabase-client';
import type { UserOrganization } from '../types/database';

export async function getUserOrganization(
  userId: string,
  organizationId: string
): Promise<UserOrganization | null> {
  const { data, error } = await supabase
    .from('user_organizations')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getUserOrganizations(userId: string): Promise<UserOrganization[]> {
  const { data, error } = await supabase
    .from('user_organizations')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data || [];
}

export async function getOrganizationUsers(organizationId: string): Promise<UserOrganization[]> {
  const { data, error } = await supabase
    .from('user_organizations')
    .select('*')
    .eq('organization_id', organizationId);
  
  if (error) throw error;
  return data || [];
}

export async function createUserOrganization(
  userOrgData: Partial<UserOrganization>
): Promise<UserOrganization> {
  const { data, error } = await supabase
    .from('user_organizations')
    .insert([userOrgData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateUserOrganization(
  userOrganizationId: string,
  updates: Partial<UserOrganization>
): Promise<UserOrganization> {
  const { data, error } = await supabase
    .from('user_organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('user_organization_id', userOrganizationId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteUserOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('user_organizations')
    .delete()
    .eq('user_id', userId)
    .eq('organization_id', organizationId);
  
  if (error) throw error;
  return true;
}

export async function updateUserOrganizationRole(
  userId: string,
  organizationId: string,
  roleId: string
): Promise<UserOrganization> {
  const existing = await getUserOrganization(userId, organizationId);
  if (!existing) {
    throw new Error('User organization relationship not found');
  }
  return updateUserOrganization(existing.user_organization_id, { role_id: roleId });
}

