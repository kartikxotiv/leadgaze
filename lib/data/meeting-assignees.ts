import { supabase } from "../supabase-client";

export type MeetingAssignee = {
  id: string;
  meeting_id: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type MeetingAssigneeWithUser = MeetingAssignee & {
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

export async function getMeetingAssignees(
  meetingId: string
): Promise<MeetingAssigneeWithUser[]> {
  const { data, error } = await supabase
    .from("meetings_assignees")
    .select(
      `
      *,
      user:users!meetings_assignees_user_id_fkey (
        user_id,
        first_name,
        last_name,
        email
      ),
      assigned_by_user:users!meetings_assignees_assigned_by_fkey (
        user_id,
        first_name,
        last_name,
        email
      )
    `
    )
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as MeetingAssigneeWithUser[]) ?? [];
}

export async function addMeetingAssignee(
  meetingId: string,
  userId: string,
  assignedBy?: string
): Promise<MeetingAssignee> {
  const { data: existing } = await supabase
    .from("meetings_assignees")
    .select("id")
    .eq("meeting_id", meetingId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    throw new Error("User is already assigned to this meeting");
  }

  const { data, error } = await supabase
    .from("meetings_assignees")
    .insert([
      {
        meeting_id: meetingId,
        user_id: userId,
        assigned_by: assignedBy || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as MeetingAssignee;
}

export async function removeMeetingAssignee(
  meetingId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("meetings_assignees")
    .delete()
    .eq("meeting_id", meetingId)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}

export async function updateMeetingAssignees(
  meetingId: string,
  userIds: string[],
  assignedBy?: string
): Promise<MeetingAssigneeWithUser[]> {
  await supabase
    .from("meetings_assignees")
    .delete()
    .eq("meeting_id", meetingId);

  if (userIds.length === 0) {
    return [];
  }

  const inserts = userIds.map((userId) => ({
    meeting_id: meetingId,
    user_id: userId,
    assigned_by: assignedBy || null,
  }));

  const { data, error } = await supabase
    .from("meetings_assignees")
    .insert(inserts)
    .select(
      `
      *,
      user:users!meetings_assignees_user_id_fkey (
        user_id,
        first_name,
        last_name,
        email
      ),
      assigned_by_user:users!meetings_assignees_assigned_by_fkey (
        user_id,
        first_name,
        last_name,
        email
      )
    `
    );

  if (error) throw error;
  return (data as MeetingAssigneeWithUser[]) ?? [];
}
