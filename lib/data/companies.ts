import { supabase } from '../supabase-client';
import type { Company, CompanyWithRelations } from '../types/database';
import { paginateQuery, buildSearchQuery, buildWhereFilters } from '../utils/supabase-queries';
import type { PaginationResult } from '../utils/supabase-queries';

export async function getCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCompanyById(companyId: string): Promise<Company | null> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getCompanyWithRelations(companyId: string): Promise<CompanyWithRelations | null> {
  const { data, error } = await supabase
    .from('companies')
    .select(`
      *,
      contacts:contacts!contacts_company_id_fkey(id, first_name, last_name, email)
    `)
    .eq('id', companyId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getCompaniesPaginated(
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<CompanyWithRelations>> {
  let query = supabase
    .from('companies')
    .select(`
      *,
      contacts:contacts!contacts_company_id_fkey(id, first_name, last_name, email)
    `);

  // Apply filters
  if (filters) {
    query = buildWhereFilters(query, filters);
  }

  // Apply search
  if (search) {
    query = buildSearchQuery(query, search, ['title', 'description', 'location', 'industry']);
  }

  // Apply ordering
  query = query.order('created_at', { ascending: false });

  return paginateQuery(query, { page, limit });
}

export async function createCompany(input: Partial<Company>): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .insert([input])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCompany(companyId: string, updates: Partial<Company>): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', companyId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCompany(companyId: string): Promise<boolean> {
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', companyId);
  if (error) throw error;
  return true;
}

