import { supabase } from "../supabase-client";

export type NoteAssignee = {
  id: string;
  note_id: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteAssigneeWithUser = NoteAssignee & {
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  assigned_by_user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
};

export async function getNoteAssignees(
  noteId: string
): Promise<NoteAssigneeWithUser[]> {
  const { data, error } = await supabase
    .from("notes_assignees")
    .select(
      `
      *,
      user:users!notes_assignees_user_id_fkey (
        user_id,
        first_name,
        last_name,
        email
      ),
      assigned_by_user:users!notes_assignees_assigned_by_fkey (
        user_id,
        first_name,
        last_name,
        email
      )
    `
    )
    .eq("note_id", noteId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as NoteAssigneeWithUser[]) ?? [];
}

export async function addNoteAssignee(
  noteId: string,
  userId: string,
  assignedBy?: string
): Promise<NoteAssignee> {
  const { data: existing } = await supabase
    .from("notes_assignees")
    .select("id")
    .eq("note_id", noteId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    throw new Error("User is already assigned to this note");
  }

  const { data, error } = await supabase
    .from("notes_assignees")
    .insert([
      {
        note_id: noteId,
        user_id: userId,
        assigned_by: assignedBy || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as NoteAssignee;
}

export async function removeNoteAssignee(
  noteId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("notes_assignees")
    .delete()
    .eq("note_id", noteId)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}

export async function updateNoteAssignees(
  noteId: string,
  userIds: string[],
  assignedBy?: string
): Promise<NoteAssigneeWithUser[]> {
  await supabase.from("notes_assignees").delete().eq("note_id", noteId);

  if (userIds.length === 0) {
    return [];
  }

  const inserts = userIds.map((userId) => ({
    note_id: noteId,
    user_id: userId,
    assigned_by: assignedBy || null,
  }));

  const { data, error } = await supabase
    .from("notes_assignees")
    .insert(inserts)
    .select(
      `
      *,
      user:users!notes_assignees_user_id_fkey (
        user_id,
        first_name,
        last_name,
        email
      ),
      assigned_by_user:users!notes_assignees_assigned_by_fkey (
        user_id,
        first_name,
        last_name,
        email
      )
    `
    );

  if (error) throw error;
  return (data as NoteAssigneeWithUser[]) ?? [];
}
