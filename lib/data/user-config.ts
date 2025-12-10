import { supabase } from '../supabase-client';
import type { UserConfig } from '../types/database';

export async function getUserConfigById(id: string): Promise<UserConfig | null> {
  const { data, error } = await supabase
    .from('users_config')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getUserConfigByTypeAndValue(
  entityType: string,
  entityValue: string
): Promise<UserConfig | null> {
  const { data, error } = await supabase
    .from('users_config')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_value', entityValue)
    .eq('is_active', true)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

export async function getUserConfigsByType(entityType: string): Promise<UserConfig[]> {
  const { data, error } = await supabase
    .from('users_config')
    .select('*')
    .eq('entity_type', entityType)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function createUserConfig(configData: Partial<UserConfig>): Promise<UserConfig> {
  const { data, error } = await supabase
    .from('users_config')
    .insert([configData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

