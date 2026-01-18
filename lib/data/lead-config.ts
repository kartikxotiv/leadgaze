import { supabase } from '../supabase-client';
import type { LeadConfig } from '../types/database';

export async function getLeadConfigById(id: string): Promise<LeadConfig | null> {
  const { data, error } = await supabase
    .from('leads_config')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getLeadConfigByTypeAndValue(
  entityType: string,
  entityValue: string
): Promise<LeadConfig | null> {
  const { data, error } = await supabase
    .from('leads_config')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_value', entityValue)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getLeadConfigsByType(entityType: string): Promise<LeadConfig[]> {
  const { data, error } = await supabase
    .from('leads_config')
    .select('*')
    .eq('entity_type', entityType)
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function getAllLeadConfigs(): Promise<LeadConfig[]> {
  const { data, error } = await supabase
    .from('leads_config')
    .select('*')
    .eq('is_active', true)
    .order('entity_type', { ascending: true })
    .order('display_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function createLeadConfig(configData: Partial<LeadConfig>): Promise<LeadConfig> {
  const { data, error } = await supabase
    .from('leads_config')
    .insert([configData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateLeadConfig(
  id: string,
  updates: Partial<LeadConfig>
): Promise<LeadConfig> {
  const { data, error } = await supabase
    .from('leads_config')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteLeadConfig(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('leads_config')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

