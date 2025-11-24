import { supabase } from "../supabase-client";
import type { Workspace, WorkspaceWithRelations } from "../types/database";
import {
  paginateQuery,
  buildSearchQuery,
  buildWhereFilters,
} from "../utils/supabase-queries";
import type { PaginationResult } from "../utils/supabase-queries";

export async function getWorkspaces(
  organizationId: string
): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getWorkspaceById(
  workspaceId: string
): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function getWorkspaceWithRelations(
  workspaceId: string
): Promise<WorkspaceWithRelations | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select(
      `
      *,
      organization:organizations!workspaces_organization_id_fkey(organization_id, name, slug)
    `
    )
    .eq("id", workspaceId)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data || null;
}

export async function getWorkspacesPaginated(
  organizationId: string,
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, any>,
  search?: string
): Promise<PaginationResult<WorkspaceWithRelations>> {
  let query = supabase
    .from("workspaces")
    .select(
      `
      *,
      organization:organizations!workspaces_organization_id_fkey(organization_id, name, slug)
    `
    )
    .eq("organization_id", organizationId);

  // Apply filters
  if (filters) {
    query = buildWhereFilters(query, filters);
  }

  // Apply search
  if (search) {
    query = buildSearchQuery(query, search, ["name", "description"]);
  }

  // Apply ordering
  query = query.order("created_at", { ascending: false });

  return paginateQuery(query, { page, limit });
}

export async function createWorkspace(
  input: Partial<Workspace>
): Promise<Workspace> {
  const { data, error } = await supabase
    .from("workspaces")
    .insert([input])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<Workspace>
): Promise<Workspace> {
  const { data, error } = await supabase
    .from("workspaces")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", workspaceId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWorkspace(workspaceId: string): Promise<boolean> {
  const { error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);
  if (error) throw error;
  return true;
}

/**
 * Get workspaces where user is a member (via workspace_members)
 */
export async function getWorkspacesByUserId(
  userId: string
): Promise<WorkspaceWithRelations[]> {
  // First, get workspace IDs where user is a member
  const { data: membersData, error: membersError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .eq("status", "accepted");

  if (membersError) {
    console.error(
      "[getWorkspacesByUserId] Error fetching workspace members:",
      membersError
    );
    throw membersError;
  }

  if (!membersData || membersData.length === 0) {
    console.log(
      `[getWorkspacesByUserId] No workspace members found for user ${userId}`
    );
    return [];
  }

  const workspaceIds = membersData
    .map((m: any) => m.workspace_id)
    .filter((id: any) => id !== null && id !== undefined);

  if (workspaceIds.length === 0) {
    console.log(
      `[getWorkspacesByUserId] No valid workspace IDs found for user ${userId}`
    );
    return [];
  }

  console.log(
    `[getWorkspacesByUserId] Found ${workspaceIds.length} workspace IDs for user ${userId}:`,
    workspaceIds
  );

  // Then fetch the workspaces with their organization info
  const { data: workspacesData, error: workspacesError } = await supabase
    .from("workspaces")
    .select(
      `
      *,
      organization:organizations!workspaces_organization_id_fkey(organization_id, name, slug)
    `
    )
    .in("id", workspaceIds)
    .order("created_at", { ascending: false });

  if (workspacesError) {
    console.error(
      "[getWorkspacesByUserId] Error fetching workspaces:",
      workspacesError
    );
    throw workspacesError;
  }

  console.log(
    `[getWorkspacesByUserId] Found ${
      workspacesData?.length || 0
    } workspaces for user ${userId}`
  );

  return workspacesData || [];
}
