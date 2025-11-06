import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";

export interface WorkspaceRole {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, any>;
  hierarchy_level: number;
}

export interface WorkspaceRoleFilters {
  workspaceId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateWorkspaceRoleData {
  name: string;
  description?: string;
  permissions: Record<string, any>;
  hierarchy_level: number;
}

export interface UpdateWorkspaceRoleData extends Partial<CreateWorkspaceRoleData> {}

export function useWorkspaceRoles(filters?: WorkspaceRoleFilters) {
  const { token } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery({
    queryKey: ["workspace-roles", filters],
    
    enabled: isReady && isAuthenticated && !!currentWorkspace?.id,
    queryFn: async () => {
      const params = new URLSearchParams({
        workspaceId: currentWorkspace?.id || "",
        page: filters?.page?.toString() || "1",
        limit: filters?.limit?.toString() || "20",
      });
      if (filters?.search && filters.search.trim()) {
        params.set("search", filters.search);
      }
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
      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkspaceRole(roleId: string) {
  const { token } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();
  const { currentWorkspace } = useWorkspaceContext();
  return useQuery({
    queryKey: ["workspace-role", roleId],
    enabled: isReady && isAuthenticated && !!currentWorkspace?.id && !!roleId,
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
  const { currentWorkspace } = useWorkspaceContext();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateWorkspaceRoleData) => {
      if (!currentWorkspace?.id) {
        throw new Error("Workspace ID is required");
      }
      const response = await fetch(`/api/workspace-roles`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: 'POST',
        body: JSON.stringify({
          ...data,
          workspaceId: currentWorkspace.id,
        }),
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
    mutationFn: async ({ id, ...data }: UpdateWorkspaceRoleData & { id: string }) => {
      const response = await fetch(`/api/workspace-roles/${id}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        method: 'PUT',
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
      queryClient.invalidateQueries({ queryKey: ["workspace-role", variables.id] });
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
        method: 'DELETE',
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
