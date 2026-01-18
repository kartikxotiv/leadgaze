import { supabase } from "../supabase-client";
import type { WorkspaceRole as WorkspaceRoleType } from "../types/database";
import {
  paginateQuery,
  buildSearchQuery,
  buildWhereFilters,
  PaginationResult,
} from "../utils/supabase-queries";

export async function createWorkspaceRole(
  input: Partial<WorkspaceRoleType>
): Promise<WorkspaceRoleType> {
  console.log("Creating workspace role with input:", {
    name: input.name,
    hasPermissions: !!input.permissions,
    permissionsType: typeof input.permissions,
    permissionsKeys: input.permissions ? Object.keys(input.permissions) : [],
    permissionsCount: input.permissions
      ? Object.keys(input.permissions).length
      : 0,
    createdBy: input.created_by,
  });

  // Log full permissions structure
  if (input.permissions) {
    console.log(
      "Permissions data:",
      JSON.stringify(input.permissions, null, 2)
    );
  }

  const { data, error } = await supabase
    .from("workspace_roles")
    .insert(input)
    .select()
    .single();

  if (error) {
    console.error("Error creating workspace role:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw error;
  }

  console.log("Successfully created workspace role:", {
    id: data?.id,
    name: data?.name,
    permissionsKeys: data?.permissions ? Object.keys(data.permissions) : [],
  });
  return data;
}

export async function updateWorkspaceRole(
  id: string,
  input: Partial<WorkspaceRoleType>
): Promise<WorkspaceRoleType> {
  const { data, error } = await supabase
    .from("workspace_roles")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkspaceRole(
  id: string
): Promise<WorkspaceRoleType | null> {
  const { data, error } = await supabase
    .from("workspace_roles")
    .update({ is_deleted: true })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getWorkspaceRoleById(
  id: string
): Promise<WorkspaceRoleType | null> {
  const { data, error } = await supabase
    .from("workspace_roles")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();
  if (error) {
    // If no rows found, return null instead of throwing
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }
  return data;
}

export async function getWorkspaceRoles(): Promise<WorkspaceRoleType[]> {
  const { data, error } = await supabase
    .from("workspace_roles")
    .select("*")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getWorkspaceRolesByWorkspaceId(
  workspaceId: string
): Promise<WorkspaceRoleType[]> {
  const roleIdsSet = new Set<string>();

  const { data: invites, error: invitesError } = await supabase
    .from("workspace_invites")
    .select("role_id")
    .eq("workspace_id", workspaceId);

  if (!invitesError && invites) {
    invites.forEach((invite: any) => {
      if (invite.role_id) {
        roleIdsSet.add(invite.role_id);
      }
    });
  }

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("role_id")
    .eq("workspace_id", workspaceId)
    .eq("is_deleted", false);

  if (membersError) {
    const errorMessage = membersError.message || "";
    if (
      errorMessage.includes("does not exist") ||
      errorMessage.includes("column")
    ) {
      console.log(
        "workspace_members.workspace_id column not available, using workspace_invites only"
      );
    } else {
      console.warn("Error fetching workspace_members:", membersError);
    }
  } else if (members) {
    members.forEach((member: any) => {
      if (member.role_id) {
        roleIdsSet.add(member.role_id);
      }
    });
  }

  if (roleIdsSet.size === 0) {
    const { data: allRoles, error: allRolesError } = await supabase
      .from("workspace_roles")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (allRolesError) throw allRolesError;
    return allRoles || [];
  }

  const roleIds = Array.from(roleIdsSet);

  const { data: roles, error: rolesError } = await supabase
    .from("workspace_roles")
    .select("*")
    .in("id", roleIds)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (rolesError) throw rolesError;
  return roles || [];
}

export async function getWorkspaceRolesPaginated(
  page: number,
  limit: number,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<WorkspaceRoleType>> {
  let query = supabase
    .from("workspace_roles")
    .select("*")
    .eq("is_deleted", false);

  if (filters) {
    query = buildWhereFilters(query, filters);
  }
  if (search) {
    query = buildSearchQuery(query, search, ["name"]);
  }
  query = query.order("created_at", { ascending: false });
  return paginateQuery(query, { page, limit });
}
