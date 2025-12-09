import { supabase } from "../supabase-client";

export interface Note {
  id: string;
  lead_id: string;
  title: string;
  description: string;
  created_by: string | null;
  updated_at: string;
  created_at: string;
  workspace_id: string;
  status: string | null;
  due_date: string | null;
}

export async function getNoteById(noteId: string): Promise<Note | null> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function getNotesByLeadId(leadId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getNotesByWorkspaceId(
  workspaceId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  data: Note[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  offset: number;
}> {
  let query = supabase
    .from("notes")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId);

  query = query.order("created_at", { ascending: false });

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

export async function createNote(noteData: Partial<Note>): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .insert([noteData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateNote(
  noteId: string,
  updates: Partial<Note>
): Promise<Note> {
  const { data, error } = await supabase
    .from("notes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", noteId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNote(noteId: string): Promise<boolean> {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);

  if (error) throw error;
  return true;
}
