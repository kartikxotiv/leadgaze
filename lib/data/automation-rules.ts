import { supabase } from '../supabase-client';
import type { AutomationRule } from '../types/database';

export async function getAutomationRuleById(ruleId: string): Promise<AutomationRule | null> {
  const { data, error } = await supabase
    .from('automation_rules')
    .select('*')
    .eq('rule_id', ruleId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getAutomationRulesByOrganization(
  organizationId: string,
  trigger?: string,
  activeOnly: boolean = true
): Promise<AutomationRule[]> {
  let query = supabase
    .from('automation_rules')
    .select('*')
    .eq('organization_id', organizationId);

  if (trigger) {
    query = query.eq('trigger', trigger);
  }

  if (activeOnly) {
    query = query.eq('is_active', true);
  }

  query = query.order('priority', { ascending: true });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createAutomationRule(ruleData: Partial<AutomationRule>): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from('automation_rules')
    .insert([ruleData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateAutomationRule(
  ruleId: string,
  updates: Partial<AutomationRule>
): Promise<AutomationRule> {
  const { data, error } = await supabase
    .from('automation_rules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('rule_id', ruleId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteAutomationRule(ruleId: string): Promise<boolean> {
  const { error } = await supabase
    .from('automation_rules')
    .delete()
    .eq('rule_id', ruleId);
  
  if (error) throw error;
  return true;
}

