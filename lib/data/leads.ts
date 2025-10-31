import { supabase } from '../supabase-client';
import type { Lead, LeadWithRelations } from '../types/database';
import { paginateQuery, buildSearchQuery, buildWhereFilters } from '../utils/supabase-queries';
import type { PaginationResult } from '../utils/supabase-queries';

export async function getLeads(organizationId: string): Promise<Lead[]> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getLeadById(leadId: string): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('lead_id', leadId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getLeadWithRelations(leadId: string): Promise<LeadWithRelations | null> {
  const { data, error } = await supabase
    .from('leads')
    .select(`
      *,
      status:leads_config!leads_status_id_fkey(id, entity_value, description, metadata),
      source_config:leads_config!leads_source_id_fkey(id, entity_value, description),
      industry:leads_config!leads_industry_id_fkey(id, entity_value, description),
      company_size:leads_config!leads_company_size_id_fkey(id, entity_value, description),
      score_grade:leads_config!leads_score_grade_id_fkey(id, entity_value, description, metadata),
      assigned_user:users!leads_assigned_to_fkey(user_id, first_name, last_name, email),
      created_user:users!leads_created_by_fkey(user_id, first_name, last_name),
      score_data:lead_scores!lead_scores_lead_id_fkey(score_id, total_score, tier, last_calculated, score_breakdown)
    `)
    .eq('lead_id', leadId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getLeadsPaginated(
  organizationId: string,
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<LeadWithRelations>> {
  let query = supabase
    .from('leads')
    .select(`
      *,
      status:leads_config!leads_status_id_fkey(id, entity_value, description, metadata),
      source_config:leads_config!leads_source_id_fkey(id, entity_value, description),
      industry:leads_config!leads_industry_id_fkey(id, entity_value, description),
      company_size:leads_config!leads_company_size_id_fkey(id, entity_value, description),
      score_grade:leads_config!leads_score_grade_id_fkey(id, entity_value, description, metadata),
      assigned_user:users!leads_assigned_to_fkey(user_id, first_name, last_name, email),
      created_user:users!leads_created_by_fkey(user_id, first_name, last_name),
      score_data:lead_scores!lead_scores_lead_id_fkey(score_id, total_score, tier, last_calculated, score_breakdown)
    `)
    .eq('organization_id', organizationId);

  // Apply filters
  if (filters) {
    query = buildWhereFilters(query, filters);
  }

  // Apply search
  if (search) {
    query = buildSearchQuery(query, search, ['first_name', 'last_name', 'email', 'business_name']);
  }

  // Apply ordering
  query = query.order('created_at', { ascending: false });

  return paginateQuery(query, { page, limit });
}

export async function createLead(input: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .insert([input])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLead(leadId: string, updates: Partial<Lead>): Promise<Lead> {
  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('lead_id', leadId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLead(leadId: string): Promise<boolean> {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('lead_id', leadId);
  if (error) throw error;
  return true;
}

export async function findDuplicateLeads(
  criteria: Partial<Lead>,
  organizationId: string
): Promise<Lead[]> {
  let query = supabase.from('leads').select('*').eq('organization_id', organizationId);
  
  if (criteria.email) {
    query = query.ilike('email', `%${criteria.email}%`);
  }
  if (criteria.phone) {
    query = query.ilike('phone', `%${criteria.phone}%`);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function findLeadByEmail(
  email: string,
  organizationId: string
): Promise<Lead | null> {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('email', email.toLowerCase())
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function updateLeadScore(leadId: string, score: number): Promise<Lead> {
  return updateLead(leadId, { lead_score: score });
}

