import { supabase } from "../supabase-client";
import type { Database } from "@/database.types";
import {
  paginateQuery,
  buildSearchQuery,
  buildWhereFilters,
} from "../utils/supabase-queries";
import type { PaginationResult } from "../utils/supabase-queries";

export type WorkspaceInvite =
  Database["public"]["Tables"]["workspace_invites"]["Row"];
export type WorkspaceInviteInsert =
  Database["public"]["Tables"]["workspace_invites"]["Insert"];
export type WorkspaceInviteUpdate =
  Database["public"]["Tables"]["workspace_invites"]["Update"];

export type WorkspaceInviteStatus = "pending" | "accepted" | "rejected";

export interface WorkspaceInviteWithRelations extends WorkspaceInvite {
  workspace?: {
    id: string;
    name: string;
    description?: string;
  };
  role?: {
    id: string;
    name: string;
    permissions: Record<string, any>;
  };
  invited_by_user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

/**
 * Create a new workspace invite
 */
export async function createWorkspaceInvite(
  input: WorkspaceInviteInsert
): Promise<WorkspaceInvite> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .insert([{ ...input, updated_at: new Date().toISOString() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update an existing workspace invite
 */
export async function updateWorkspaceInvite(
  id: string,
  input: WorkspaceInviteUpdate
): Promise<WorkspaceInvite> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Delete a workspace invite
 */
export async function deleteWorkspaceInvite(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("workspace_invites")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

/**
 * Get a workspace invite by ID
 */
export async function getWorkspaceInviteById(
  id: string
): Promise<WorkspaceInviteWithRelations | null> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .select(
      `
      *,
      workspace:workspaces!workspace_invites_workspace_id_fkey(id, name, description),
      role:workspace_roles!workspace_invites_role_id_fkey(id, name, permissions),
      invited_by_user:users!workspace_invites_invited_by_fkey(user_id, first_name, last_name, email)
    `
    )
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }
  return data;
}

/**
 * Get all workspace invites by workspace ID
 */
export async function getWorkspaceInvitesByWorkspaceId(
  workspaceId: string
): Promise<WorkspaceInviteWithRelations[]> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .select(
      `
      *,
      workspace:workspaces!workspace_invites_workspace_id_fkey(id, name, description),
      role:workspace_roles!workspace_invites_role_id_fkey(id, name, permissions),
      invited_by_user:users!workspace_invites_invited_by_fkey(user_id, first_name, last_name, email)
    `
    )
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching workspace invites:", error);
    throw error;
  }

  if (!data) return [];

  // Fetch roles separately to ensure we get active roles only
  const roleIds = [...new Set(data.map((invite: any) => invite.role_id))];
  const { data: rolesData } = await supabase
    .from("workspace_roles")
    .select("id, name, permissions")
    .in("id", roleIds)
    .eq("is_deleted", false);

  const rolesMap = new Map(
    (rolesData || []).map((role: any) => [role.id, role])
  );

  // Map invites with their roles
  return data.map((invite: any) => ({
    ...invite,
    role: rolesMap.get(invite.role_id) || null,
  }));
}

/**
 * Get all workspace invites by email
 */
export async function getWorkspaceInvitesByEmail(
  email: string
): Promise<WorkspaceInviteWithRelations[]> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .select(
      `
      *,
      workspace:workspaces!workspace_invites_workspace_id_fkey(id, name, description),
      role:workspace_roles!workspace_invites_role_id_fkey(id, name, permissions),
      invited_by_user:users!workspace_invites_invited_by_fkey(user_id, first_name, last_name, email)
    `
    )
    .eq("email", email.toLowerCase())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get workspace invites by status
 */
export async function getWorkspaceInvitesByStatus(
  status: WorkspaceInviteStatus,
  workspaceId?: string
): Promise<WorkspaceInviteWithRelations[]> {
  let query = supabase
    .from("workspace_invites")
    .select(
      `
      *,
      workspace:workspaces!workspace_invites_workspace_id_fkey(id, name, description),
      role:workspace_roles!workspace_invites_role_id_fkey(id, name, permissions),
      invited_by_user:users!workspace_invites_invited_by_fkey(user_id, first_name, last_name, email)
    `
    )
    .eq("status", status);

  if (workspaceId) {
    query = query.eq("workspace_id", workspaceId);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get paginated workspace invites
 */
export async function getWorkspaceInvitesPaginated(
  workspaceId: string,
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<WorkspaceInviteWithRelations>> {
  let query = supabase
    .from("workspace_invites")
    .select(
      `
      *,
      workspace:workspaces!workspace_invites_workspace_id_fkey(id, name, description),
      role:workspace_roles!workspace_invites_role_id_fkey(id, name, permissions),
      invited_by_user:users!workspace_invites_invited_by_fkey(user_id, first_name, last_name, email)
    `,
      { count: "exact" }
    )
    .eq("workspace_id", workspaceId);

  if (filters) {
    query = buildWhereFilters(query, filters);
  }

  if (search) {
    query = buildSearchQuery(query, search, ["email"]);
  }

  query = query.order("created_at", { ascending: false });

  const result = await paginateQuery(query, { page, limit });

  // Fetch roles separately to ensure we get active roles only
  const invitesData = result.data as any[];
  if (invitesData && invitesData.length > 0) {
    const roleIds = [
      ...new Set(invitesData.map((invite: any) => invite.role_id)),
    ];
    const { data: rolesData } = await supabase
      .from("workspace_roles")
      .select("id, name, permissions")
      .in("id", roleIds)
      .eq("is_deleted", false);

    const rolesMap = new Map(
      (rolesData || []).map((role: any) => [role.id, role])
    );

    // Map invites with their roles
    const mappedInvites: WorkspaceInviteWithRelations[] = invitesData.map(
      (invite: any) => ({
        ...invite,
        role: rolesMap.get(invite.role_id) || null,
      })
    );

    return {
      ...result,
      data: mappedInvites,
    } as PaginationResult<WorkspaceInviteWithRelations>;
  }

  return result as PaginationResult<WorkspaceInviteWithRelations>;
}

/**
 * Get a workspace invite by email and workspace ID
 */
export async function getWorkspaceInviteByEmailAndWorkspace(
  email: string,
  workspaceId: string
): Promise<WorkspaceInviteWithRelations | null> {
  const { data, error } = await supabase
    .from("workspace_invites")
    .select(
      `
      *,
      workspace:workspaces!workspace_invites_workspace_id_fkey(id, name, description),
      role:workspace_roles!workspace_invites_role_id_fkey(id, name, permissions),
      invited_by_user:users!workspace_invites_invited_by_fkey(user_id, first_name, last_name, email)
    `
    )
    .eq("email", email.toLowerCase())
    .eq("workspace_id", workspaceId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }
  return data;
}
