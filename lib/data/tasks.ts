import { supabase } from '../supabase-client';
import type { Task } from '../types/database';
import { paginateQuery, buildSearchQuery, buildWhereFilters } from '../utils/supabase-queries';
import type { PaginationResult } from '../utils/supabase-queries';

export async function getTaskById(taskId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_id', taskId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getTasksPaginated(
  filters?: Record<string, any>,
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<PaginationResult<Task>> {
  let query = supabase
    .from('tasks')
    .select('*');

  if (filters) {
    query = buildWhereFilters(query, filters);
  }

  if (search) {
    query = buildSearchQuery(query, search, ['title', 'description']);
  }

  query = query
    .order('due_date', { ascending: true })
    .order('created_at', { ascending: false });

  return paginateQuery(query, { page, limit });
}

export async function createTask(taskData: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('task_id', taskId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('task_id', taskId);
  
  if (error) throw error;
  return true;
}

export async function getTasksByLeadId(leadId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('lead_id', leadId)
    .order('due_date', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

export async function getTasksByUserId(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('assigned_to', userId)
    .order('due_date', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

