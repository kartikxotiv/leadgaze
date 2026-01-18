import { supabase } from '../supabase-client';
import type { OrganizationConfig } from '../types/database';

export async function getOrganizationConfigById(id: string): Promise<OrganizationConfig | null> {
  const { data, error } = await supabase
    .from('organization_config')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getOrganizationConfigByTypeAndValue(
  entityType: string,
  entityValue: string
): Promise<OrganizationConfig | null> {
  const { data, error } = await supabase
    .from('organization_config')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_value', entityValue)
    .eq('is_active', true)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getOrganizationConfigsByType(entityType: string): Promise<OrganizationConfig[]> {
  const { data, error } = await supabase
    .from('organization_config')
    .select('*')
    .eq('entity_type', entityType)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function createOrganizationConfig(
  configData: Partial<OrganizationConfig>
): Promise<OrganizationConfig> {
  const { data, error } = await supabase
    .from('organization_config')
    .insert([configData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

