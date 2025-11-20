import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";

export interface WorkspaceRole {
  id: string;
  name: string;
  permissions: Record<string, any>;
}

export interface WorkspaceRoleFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateWorkspaceRoleData {
  name: string;
  permissions: Record<string, any>;
}

export interface UpdateWorkspaceRoleData
  extends Partial<CreateWorkspaceRoleData> {}

export function useWorkspaceRoles(filters?: WorkspaceRoleFilters) {
  const { token } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery({
    queryKey: ["workspace-roles", currentWorkspace?.id || null, filters],
    enabled: isReady && isAuthenticated,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters?.page?.toString() || "1",
        limit: filters?.limit?.toString() || "20",
      });
      if (filters?.search && filters.search.trim()) {
        params.set("search", filters.search);
      }
      // Don't filter by workspaceId when showing all roles on the roles page
      // Only filter when specifically needed (e.g., for workspace member assignment)
      // if (currentWorkspace?.id && filters?.workspaceId) {
      //   params.set("workspaceId", currentWorkspace.id);
      // }
      // Always show all roles by default
      params.set("showAll", "true");
      const response = await fetch(`/api/workspace-roles?${params}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch workspace roles");
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch workspace roles");
      }
      // Handle both response formats:
      // - When workspaceId is provided: returns { roles: [...], total: ... }
      // - When workspaceId is not provided: returns { data: PaginationResult } where PaginationResult has { data: [...], count, page, limit, totalPages }
      if (result.roles) {
        // Normalize workspaceId response format to match pagination format
        return {
          data: result.roles,
          count: result.total || result.roles.length,
          page: 1,
          limit: result.roles.length,
          totalPages: 1,
        };
      }
      // Return paginated response as-is
      return result.data;
    },
    staleTime: 0, // Always refetch when workspace changes
  });
}

export function useWorkspaceRole(roleId: string) {
  const { token } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();
  return useQuery({
    queryKey: ["workspace-role", roleId],
    enabled: isReady && isAuthenticated && !!roleId,
    queryFn: async () => {
      const response = await fetch(`/api/workspace-roles/${roleId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch workspace role");
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch workspace role");
      }
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateWorkspaceRole() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWorkspaceRoleData) => {
      const response = await fetch(`/api/workspace-roles`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to create workspace role");
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to create workspace role");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-roles"] });
    },
  });
}

export function useUpdateWorkspaceRole() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: UpdateWorkspaceRoleData & { id: string }) => {
      const response = await fetch(`/api/workspace-roles/${id}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update workspace role");
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to update workspace role");
      }
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspace-roles"] });
      queryClient.invalidateQueries({
        queryKey: ["workspace-role", variables.id],
      });
    },
  });
}

export function useDeleteWorkspaceRole() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      const response = await fetch(`/api/workspace-roles/${roleId}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete workspace role");
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to delete workspace role");
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspace-roles"] });
    },
  });
}
