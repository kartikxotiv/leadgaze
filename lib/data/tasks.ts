import { supabase } from "../supabase-client";
import type { Task } from "../types/database";
import {
  paginateQuery,
  buildSearchQuery,
  buildWhereFilters,
} from "../utils/supabase-queries";
import type { PaginationResult } from "../utils/supabase-queries";

export async function getTaskById(taskId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("task_id", taskId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function getTasksPaginated(
  filters?: Record<string, any>,
  page: number = 1,
  limit: number = 20,
  search?: string
): Promise<PaginationResult<Task>> {
  let query = supabase.from("tasks").select("*");

  if (filters) {
    query = buildWhereFilters(query, filters);
  }

  if (search) {
    query = buildSearchQuery(query, search, ["title", "description"]);
  }

  query = query
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  return paginateQuery(query, { page, limit });
}

export async function createTask(taskData: Partial<Task>): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert([taskData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("task_id", taskId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string): Promise<boolean> {
  const { error } = await supabase.from("tasks").delete().eq("task_id", taskId);

  if (error) throw error;
  return true;
}

export async function getTasksByLeadId(leadId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("lead_id", leadId)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getTasksByUserId(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", userId)
    .order("due_date", { ascending: true });

  if (error) throw error;
  return data || [];
}

export type UnifiedTask = {
  id: string;
  type: "note" | "meeting" | "task";
  title: string;
  description: string | null;
  status: string;
  workspace_id: string | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  // Additional fields based on type
  time?: string; // for meetings
  due_date?: string | null; // for tasks
  priority?: string; // for tasks
  meeting_notes?: string | null; // for meetings
  link?: string | null; // for meetings
};

export async function getUnifiedTasksByWorkspace(
  workspaceId: string
): Promise<UnifiedTask[]> {
  // Get all leads in this workspace first (we'll need this for notes, meetings, and tasks)
  const { data: workspaceLeads, error: leadsError } = await supabase
    .from("sales_leads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false);

  if (leadsError) throw leadsError;

  const leadIds = workspaceLeads?.map((l) => l.id) || [];

  // Fetch notes - get notes with direct workspace_id match
  const { data: notesWithWorkspace, error: notesError1 } = await supabase
    .from("notes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (notesError1) throw notesError1;

  // Also fetch notes linked to leads in this workspace (in case workspace_id wasn't set properly)
  let notesViaLead: any[] = [];
  if (leadIds.length > 0) {
    const { data: notesByLead, error: notesError2 } = await supabase
      .from("notes")
      .select("*")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });

    if (notesError2) throw notesError2;
    notesViaLead = notesByLead || [];
  }

  // Combine and deduplicate notes
  const allNotesMap = new Map();
  (notesWithWorkspace || []).forEach((n: any) => {
    allNotesMap.set(n.id, n);
  });
  notesViaLead.forEach((n: any) => {
    if (!allNotesMap.has(n.id)) {
      allNotesMap.set(n.id, n);
    }
  });

  const notes = Array.from(allNotesMap.values());

  // Fetch meetings - get all meetings and filter by workspace
  // First get meetings with direct workspace_id match
  const { data: meetingsWithWorkspace, error: meetingsError1 } = await supabase
    .from("meetings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("time", { ascending: false });

  if (meetingsError1) throw meetingsError1;

  // Fetch meetings linked to these leads (that might not have workspace_id set)
  let meetingsViaLead: any[] = [];
  if (leadIds.length > 0) {
    const { data: meetingsByLead, error: meetingsError2 } = await supabase
      .from("meetings")
      .select("*")
      .in("lead_id", leadIds)
      .order("time", { ascending: false });

    if (meetingsError2) throw meetingsError2;
    meetingsViaLead = meetingsByLead || [];
  }

  // Combine and deduplicate meetings
  const allMeetingsMap = new Map();
  (meetingsWithWorkspace || []).forEach((m: any) => {
    allMeetingsMap.set(m.id, m);
  });
  meetingsViaLead.forEach((m: any) => {
    if (!allMeetingsMap.has(m.id)) {
      allMeetingsMap.set(m.id, m);
    }
  });

  const meetings = Array.from(allMeetingsMap.values());

  // Fetch tasks - need to filter by workspace via lead
  // Reuse the leads we already fetched for meetings
  // leadIds is already available from above

  // Fetch tasks for these leads
  let tasksQuery = supabase.from("tasks").select("*");

  if (leadIds.length > 0) {
    tasksQuery = tasksQuery.in("lead_id", leadIds);
  } else {
    // No leads in workspace, return empty tasks
    tasksQuery = tasksQuery.eq(
      "task_id",
      "00000000-0000-0000-0000-000000000000"
    ); // Return nothing
  }

  const { data: tasks, error: tasksError } = await tasksQuery
    .order("due_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (tasksError) throw tasksError;

  // Map status from database to UI format
  const mapStatus = (status: string | null): string => {
    if (!status) return "NEW";
    const statusLower = status.toLowerCase();
    if (statusLower === "pending") return "NEW";
    if (statusLower === "in progress") return "INPROGRESS";
    if (statusLower === "completed") return "DONE";
    return "NEW";
  };

  // Transform notes to unified format
  const unifiedNotes: UnifiedTask[] = (notes || []).map((note) => ({
    id: `note-${note.id}`,
    type: "note" as const,
    title: note.title,
    description: note.description,
    status: mapStatus(note.status),
    workspace_id: note.workspace_id,
    lead_id: note.lead_id,
    created_at: note.created_at,
    updated_at: note.updated_at,
    created_by: note.created_by,
    due_date: note.due_date || null,
  }));

  // Transform meetings to unified format
  const unifiedMeetings: UnifiedTask[] = (meetings || []).map((meeting) => ({
    id: `meeting-${meeting.id}`,
    type: "meeting" as const,
    title: meeting.title,
    description: meeting.description,
    status: mapStatus(meeting.status),
    workspace_id: meeting.workspace_id,
    lead_id: meeting.lead_id,
    created_at: meeting.created_at,
    updated_at: meeting.updated_at,
    created_by: meeting.created_by,
    time: meeting.time,
    meeting_notes: meeting.meeting_notes,
    link: meeting.link,
  }));

  // Transform tasks to unified format
  const unifiedTasks: UnifiedTask[] = (tasks || []).map((task) => ({
    id: `task-${task.task_id}`,
    type: "task" as const,
    title: task.title,
    description: task.description,
    status: mapStatus(task.status),
    workspace_id: null, // Tasks don't have direct workspace_id
    lead_id: task.lead_id,
    created_at: task.created_at,
    updated_at: task.updated_at,
    created_by: task.created_by,
    due_date: task.due_date,
    priority: task.priority,
  }));

  // Combine and sort by created_at
  const allTasks = [...unifiedNotes, ...unifiedMeetings, ...unifiedTasks];
  return allTasks.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
