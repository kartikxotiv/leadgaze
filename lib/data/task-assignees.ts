import { supabase } from "../supabase-client";

export type TaskAssignee = {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TaskAssigneeInsert = {
  task_id: string;
  user_id: string;
  assigned_by?: string | null;
};

export type TaskAssigneeWithUser = TaskAssignee & {
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

export async function getTaskAssignees(
  taskId: string
): Promise<TaskAssigneeWithUser[]> {
  const { data, error } = await supabase
    .from("tasks_assignees")
    .select(
      `
      *,
      user:users!tasks_assignees_user_id_fkey (
        user_id,
        first_name,
        last_name,
        email
      ),
      assigned_by_user:users!tasks_assignees_assigned_by_fkey (
        user_id,
        first_name,
        last_name,
        email
      )
    `
    )
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as TaskAssigneeWithUser[]) ?? [];
}

export async function addTaskAssignee(
  taskId: string,
  userId: string,
  assignedBy?: string
): Promise<TaskAssignee> {
  const { data: existing } = await supabase
    .from("tasks_assignees")
    .select("id")
    .eq("task_id", taskId)
    .eq("user_id", userId)
    .single();

  if (existing) {
    throw new Error("User is already assigned to this task");
  }

  const { data, error } = await supabase
    .from("tasks_assignees")
    .insert([
      {
        task_id: taskId,
        user_id: userId,
        assigned_by: assignedBy || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as TaskAssignee;
}

export async function removeTaskAssignee(
  taskId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("tasks_assignees")
    .delete()
    .eq("task_id", taskId)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}

export async function updateTaskAssignees(
  taskId: string,
  userIds: string[],
  assignedBy?: string
): Promise<TaskAssigneeWithUser[]> {
  await supabase.from("tasks_assignees").delete().eq("task_id", taskId);

  if (userIds.length === 0) {
    return [];
  }

  const inserts = userIds.map((userId) => ({
    task_id: taskId,
    user_id: userId,
    assigned_by: assignedBy || null,
  }));

  const { data, error } = await supabase
    .from("tasks_assignees")
    .insert(inserts)
    .select(
      `
      *,
      user:users!tasks_assignees_user_id_fkey (
        user_id,
        first_name,
        last_name,
        email
      ),
      assigned_by_user:users!tasks_assignees_assigned_by_fkey (
        user_id,
        first_name,
        last_name,
        email
      )
    `
    );

  if (error) throw error;
  return (data as TaskAssigneeWithUser[]) ?? [];
}

export async function getTasksForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("tasks_assignees")
    .select("task_id")
    .eq("user_id", userId);

  if (error) throw error;
  return data?.map((item) => item.task_id) ?? [];
}
