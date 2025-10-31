import { supabase } from '../supabase-client';
import type { Deal } from '../types/database';

export async function getDealById(dealId: string): Promise<Deal | null> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('deal_id', dealId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getDeals(organizationId: string): Promise<Deal[]> {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getDealsPaginated(
  organizationId: string,
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>
): Promise<{ data: Deal[]; total: number; page: number; limit: number; totalPages: number; offset: number }> {
  let query = supabase
    .from('deals')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId);

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });
  }

  query = query.order('created_at', { ascending: false });

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
    offset,
  };
}

export async function createDeal(dealData: Partial<Deal>): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .insert([dealData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateDeal(dealId: string, updates: Partial<Deal>): Promise<Deal> {
  const { data, error } = await supabase
    .from('deals')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('deal_id', dealId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteDeal(dealId: string): Promise<boolean> {
  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('deal_id', dealId);
  
  if (error) throw error;
  return true;
}

