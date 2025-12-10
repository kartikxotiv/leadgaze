import { supabase } from '../supabase-client';
import type { Activity, ActivityWithRelations } from '../types/database';
import { paginateQuery, buildWhereFilters, buildDateRange } from '../utils/supabase-queries';
import type { PaginationResult } from '../utils/supabase-queries';

export async function getActivityById(activityId: string): Promise<Activity | null> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('activity_id', activityId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getActivityWithRelations(activityId: string): Promise<ActivityWithRelations | null> {
  const { data, error } = await supabase
    .from('activities')
    .select(`
      *,
      user:users!activities_user_id_fkey(user_id, first_name, last_name, email),
      lead:leads!activities_related_id_fkey(lead_id, first_name, last_name, business_name)
    `)
    .eq('activity_id', activityId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getActivitiesByRelated(
  relatedType: string,
  relatedId: string
): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('related_type', relatedType)
    .eq('related_id', relatedId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getActivitiesPaginated(
  filters?: Record<string, any>,
  page: number = 1,
  limit: number = 20,
  dateFrom?: string,
  dateTo?: string
): Promise<PaginationResult<ActivityWithRelations>> {
  let query = supabase
    .from('activities')
    .select(`
      *,
      user:users!activities_user_id_fkey(user_id, first_name, last_name, email),
      lead:leads!activities_related_id_fkey(lead_id, first_name, last_name, business_name)
    `);

  if (filters) {
    query = buildWhereFilters(query, filters);
  }

  if (dateFrom || dateTo) {
    query = buildDateRange(query, 'created_at', dateFrom, dateTo);
  }

  query = query.order('created_at', { ascending: false });

  return paginateQuery(query, { page, limit });
}

export async function createActivity(activityData: Partial<Activity>): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert([activityData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateActivity(
  activityId: string,
  updates: Partial<Activity>
): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('activity_id', activityId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteActivity(activityId: string): Promise<boolean> {
  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('activity_id', activityId);
  
  if (error) throw error;
  return true;
}

