import { supabase } from "../supabase-client";

export interface Meeting {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  meeting_notes: string | null;
  time: string;
  link: string | null;
  type: string | null;
  created_by: string | null;
  updated_at: string;
  created_at: string;
}

export async function getMeetingById(
  meetingId: string
): Promise<Meeting | null> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", meetingId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function getMeetingsByLeadId(leadId: string): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .eq("lead_id", leadId)
    .order("time", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getMeetings(
  page: number = 1,
  limit: number = 20,
  filters?: { leadId?: string }
): Promise<{
  data: Meeting[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  offset: number;
}> {
  let query = supabase.from("meetings").select("*", { count: "exact" });

  if (filters?.leadId) {
    query = query.eq("lead_id", filters.leadId);
  }

  query = query.order("time", { ascending: false });

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

export async function createMeeting(
  meetingData: Partial<Meeting>
): Promise<Meeting> {
  const { data, error } = await supabase
    .from("meetings")
    .insert([meetingData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMeeting(
  meetingId: string,
  updates: Partial<Meeting>
): Promise<Meeting> {
  const { data, error } = await supabase
    .from("meetings")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", meetingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMeeting(meetingId: string): Promise<boolean> {
  const { error } = await supabase
    .from("meetings")
    .delete()
    .eq("id", meetingId);

  if (error) throw error;
  return true;
}
