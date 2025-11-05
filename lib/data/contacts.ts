import { supabase } from '../supabase-client';
import type { Contact, ContactWithRelations } from '../types/database';
import { paginateQuery, buildSearchQuery, buildWhereFilters } from '../utils/supabase-queries';
import type { PaginationResult } from '../utils/supabase-queries';

export async function getContacts(workspaceId: string): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getContactById(contactId: string): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getContactWithRelations(contactId: string): Promise<ContactWithRelations | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select(`
      *,
      company:companies!contacts_company_id_fkey(id, title, location)
    `)
    .eq('id', contactId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

export async function getContactsPaginated(
  companyId: string,
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<ContactWithRelations>> {
  let query = supabase
    .from('contacts')
    .select(`
      *,
      company:companies!contacts_company_id_fkey(id, title, location)
    `)
    .eq('company_id', companyId);

  // Apply filters
  if (filters) {
    query = buildWhereFilters(query, filters);
  }

  // Apply search
  if (search) {
    query = buildSearchQuery(query, search, ['first_name', 'last_name', 'email', 'location']);
  }

  // Apply ordering
  query = query.order('created_at', { ascending: false });

  return paginateQuery(query, { page, limit });
}

export async function createContact(input: Partial<Contact>): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .insert([input])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateContact(contactId: string, updates: Partial<Contact>): Promise<Contact> {
  const { data, error } = await supabase
    .from('contacts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', contactId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteContact(contactId: string): Promise<boolean> {
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', contactId);
  if (error) throw error;
  return true;
}

export async function findContactByEmail(
  email: string,
  companyId: string
): Promise<Contact | null> {
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('company_id', companyId)
    .eq('email', email.toLowerCase())
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

