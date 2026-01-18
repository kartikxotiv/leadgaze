import { supabase } from "../supabase-client";

export interface WorkspaceMember {
  id: string;
  user_id: string | null;
  workspace_id: string | null;
  email: string | null;
  role_id: string;
  invited_by: string;
  is_deleted: boolean;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMemberWithRelations extends WorkspaceMember {
  user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
  };
  role?: {
    id: string;
    name: string;
  };
  invited_by_user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export async function createWorkspaceMember(
  input: Partial<WorkspaceMember>
): Promise<WorkspaceMember> {
  const { data, error } = await supabase
    .from("workspace_members")
    .insert([{ ...input, updated_at: new Date().toISOString() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkspaceMember(
  id: string,
  input: Partial<WorkspaceMember>
): Promise<WorkspaceMember> {
  const { data, error } = await supabase
    .from("workspace_members")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkspaceMember(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("workspace_members")
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  return true;
}

export async function getWorkspaceMemberById(
  id: string
): Promise<WorkspaceMemberWithRelations | null> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      *,
      user:users!workspace_members_user_id_fkey(user_id, first_name, last_name, email, phone_number),
      role:workspace_roles!workspace_members_role_id_fkey(id, name),
      invited_by_user:users!workspace_members_invited_by_fkey(user_id, first_name, last_name, email)
    `
    )
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }
  return data;
}

export async function getWorkspaceMembersByWorkspaceId(
  workspaceId: string
): Promise<WorkspaceMemberWithRelations[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      *,
      user:users!workspace_members_user_id_fkey(user_id, first_name, last_name, email, phone_number),
      role:workspace_roles!workspace_members_role_id_fkey(id, name),
      invited_by_user:users!workspace_members_invited_by_fkey(user_id, first_name, last_name, email)
    `
    )
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getWorkspaceMembersByUserId(
  userId: string
): Promise<WorkspaceMemberWithRelations[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      *,
      user:users!workspace_members_user_id_fkey(user_id, first_name, last_name, email, phone_number),
      role:workspace_roles!workspace_members_role_id_fkey(id, name),
      invited_by_user:users!workspace_members_invited_by_fkey(user_id, first_name, last_name, email)
    `
    )
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getWorkspaceMemberByUserAndRole(
  userId: string,
  roleId: string
): Promise<WorkspaceMemberWithRelations | null> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      *,
      user:users!workspace_members_user_id_fkey(user_id, first_name, last_name, email, phone_number),
      role:workspace_roles!workspace_members_role_id_fkey(id, name),
      invited_by_user:users!workspace_members_invited_by_fkey(user_id, first_name, last_name, email)
    `
    )
    .eq("user_id", userId)
    .eq("role_id", roleId)
    .eq("is_deleted", false)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }
  return data;
}

export async function getWorkspaceMembersByEmail(
  email: string
): Promise<WorkspaceMemberWithRelations[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select(
      `
      *,
      user:users!workspace_members_user_id_fkey(user_id, first_name, last_name, email, phone_number),
      role:workspace_roles!workspace_members_role_id_fkey(id, name),
      invited_by_user:users!workspace_members_invited_by_fkey(user_id, first_name, last_name, email)
    `
    )
    .eq("email", email.toLowerCase())
    .eq("is_deleted", false)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}
