import { supabase } from "../supabase-client";

export interface Reminder {
  id: string;
  lead_id: string;
  content: string;
  remind_at: string;
  created_by: string | null;
  workspace_id: string | null;
  updated_at: string;
  created_at: string;
}

export async function getReminderById(reminderId: string): Promise<Reminder | null> {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("id", reminderId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function getRemindersByLeadId(leadId: string): Promise<Reminder[]> {
  const { data, error } = await supabase
    .from("reminders")
    .select("*")
    .eq("lead_id", leadId)
    .order("remind_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getRemindersByWorkspaceId(
  workspaceId: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  data: Reminder[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  offset: number;
}> {
  let query = supabase
    .from("reminders")
    .select("*", { count: "exact" })
    .eq("workspace_id", workspaceId);

  query = query.order("remind_at", { ascending: false });

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

export async function createReminder(reminderData: Partial<Reminder>): Promise<Reminder> {
  const { data, error } = await supabase
    .from("reminders")
    .insert([reminderData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReminder(
  reminderId: string,
  updates: Partial<Reminder>
): Promise<Reminder> {
  const { data, error } = await supabase
    .from("reminders")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", reminderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReminder(reminderId: string): Promise<boolean> {
  const { error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", reminderId);

  if (error) throw error;
  return true;
}

