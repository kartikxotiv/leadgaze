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
      company:companies(id, title, location)
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
      company:companies(id, title, location)
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

export async function getContactsByWorkspacePaginated(
  workspaceId: string,
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<ContactWithRelations>> {
  // Get all company IDs for this workspace
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id')
    .eq('workspace_id', workspaceId);
  
  if (companiesError) throw companiesError;
  
  const companyIds = companies?.map(c => c.id) || [];
  
  // Build query to get contacts that either:
  // 1. Have workspace_id matching the workspace, OR
  // 2. Have company_id in the workspace's companies
  // This handles both cases: contacts with workspace_id and contacts linked via companies
  let query = supabase
    .from('contacts')
    .select(`
      *,
      company:companies(id, title, location)
    `);

  // Build OR conditions for Supabase
  // We need to handle both workspace_id and company_id matching
  // This query will work after the migration adds workspace_id column
  // Before migration, it will only match by company_id (workspace_id condition will be ignored if column doesn't exist)
  const orConditions: string[] = [];
  
  // Add workspace_id condition (works after migration adds the column)
  // This will include contacts without a company_id that belong to the workspace
  orConditions.push(`workspace_id.eq.${workspaceId}`);
  
  // Add company_id conditions if we have companies
  // Include contacts that belong to companies in this workspace
  if (companyIds.length > 0) {
    // Supabase OR doesn't work well with .in(), so we add individual conditions
    // For better performance with many companies, we could use a subquery, but this works
    companyIds.forEach(companyId => {
      orConditions.push(`company_id.eq.${companyId}`);
    });
  }

  // Apply OR filter - this will match contacts with workspace_id OR company_id in the list
  // Note: If workspace_id column doesn't exist yet (before migration), 
  // Supabase may error. The migration should be run before deploying this code.
  // As a fallback, if this errors, you can temporarily use just company_id filtering
  if (orConditions.length > 0) {
    query = query.or(orConditions.join(','));
  } else {
    // If no companies and workspace_id column doesn't exist, return empty
    return {
      data: [],
      count: 0,
      page,
      limit,
      totalPages: 0,
    };
  }

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

