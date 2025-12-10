import { supabase } from '../supabase-client';
import type { Organization } from '../types/database';

export async function getOrganizationById(organizationId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('organization_id', organizationId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getOrganizationBySlug(slug: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function createOrganization(orgData: Partial<Organization>): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .insert([orgData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateOrganization(
  organizationId: string,
  updates: Partial<Organization>
): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteOrganization(organizationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('organization_id', organizationId);
  
  if (error) throw error;
  return true;
}

export async function getOrganizationsByUserId(userId: string): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('user_organizations')
    .select(`
      organization:organizations(*)
    `)
    .eq('user_id', userId);
  
  if (error) throw error;
  return (data || []).map((item: any) => item.organization).filter(Boolean);
}

export async function getUserWithOrganizations(userId: string) {
  try {
    // Get user organizations first
    const { data: userOrgs, error: userOrgsError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', userId);
    
    if (userOrgsError) {
      const errorObj = new Error(userOrgsError.message || 'Failed to fetch user organizations');
      (errorObj as any).code = userOrgsError.code;
      (errorObj as any).supabaseError = userOrgsError;
      throw errorObj;
    }
    
    if (!userOrgs || userOrgs.length === 0) {
      return [];
    }
    
    // Get organization details
    const orgIds = userOrgs.map((uo: any) => uo.organization_id);
    const { data: organizations, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .in('organization_id', orgIds);
    
    if (orgsError) {
      const errorObj = new Error(orgsError.message || 'Failed to fetch organizations');
      (errorObj as any).code = orgsError.code;
      (errorObj as any).supabaseError = orgsError;
      throw errorObj;
    }
    
    // Get role details - organization_roles uses 'id' as primary key
    const roleIds = userOrgs.map((uo: any) => uo.role_id).filter(Boolean);
    const { data: roles, error: rolesError } = await supabase
      .from('organization_roles')
      .select('id, role, display_name, permissions')
      .in('id', roleIds);
    
    if (rolesError) {
      const errorObj = new Error(rolesError.message || 'Failed to fetch roles');
      (errorObj as any).code = rolesError.code;
      (errorObj as any).supabaseError = rolesError;
      throw errorObj;
    }
    
    // Combine the data
    return userOrgs.map((uo: any) => ({
      ...uo,
      organization: organizations?.find((org: any) => org.organization_id === uo.organization_id),
      role: roles?.find((role: any) => role.id === uo.role_id),
    }));
  } catch (error: any) {
    console.error("❌ getUserWithOrganizations error:", error);
    // If it's already an Error, re-throw it; otherwise wrap it
    if (error instanceof Error) {
      throw error;
    } else {
      const wrappedError = new Error(error?.message || 'Failed to fetch user organizations');
      (wrappedError as any).originalError = error;
      throw wrappedError;
    }
  }
}

