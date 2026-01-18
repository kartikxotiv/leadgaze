import { supabase } from '../supabase-client';
import type { ScoringRule } from '../types/database';

export async function getScoringRuleById(ruleId: string): Promise<ScoringRule | null> {
  const { data, error } = await supabase
    .from('scoring_rules')
    .select('*')
    .eq('rule_id', ruleId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getScoringRulesByOrganization(
  organizationId: string,
  activeOnly: boolean = true
): Promise<ScoringRule[]> {
  let query = supabase
    .from('scoring_rules')
    .select('*')
    .eq('organization_id', organizationId);
  
  if (activeOnly) {
    query = query.eq('is_active', true);
  }
  
  query = query.order('priority', { ascending: true });
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createScoringRule(ruleData: Partial<ScoringRule>): Promise<ScoringRule> {
  const { data, error } = await supabase
    .from('scoring_rules')
    .insert([ruleData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateScoringRule(
  ruleId: string,
  updates: Partial<ScoringRule>
): Promise<ScoringRule> {
  const { data, error } = await supabase
    .from('scoring_rules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('rule_id', ruleId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteScoringRule(ruleId: string): Promise<boolean> {
  const { error } = await supabase
    .from('scoring_rules')
    .delete()
    .eq('rule_id', ruleId);
  
  if (error) throw error;
  return true;
}

