import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  organization?: {
    organizationId: string;
    name: string;
    slug: string;
  };
}

export interface WorkspaceFilters {
  organizationId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateWorkspaceData {
  name: string;
  description?: string;
  organizationId: string;
}

export interface UpdateWorkspaceData extends Partial<CreateWorkspaceData> {}

export function useWorkspaces(filters?: WorkspaceFilters) {
  const { currentOrganization, token } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();

  return useQuery({
    queryKey: [
      "workspaces",
      filters?.organizationId || currentOrganization?.organizationId,
      filters,
    ],
    enabled:
      isReady &&
      isAuthenticated &&
      !!(filters?.organizationId || currentOrganization?.organizationId),
    queryFn: async () => {
      const organizationId =
        filters?.organizationId || currentOrganization?.organizationId;
      if (!organizationId) {
        throw new Error("No organization selected");
      }

      const params = new URLSearchParams({
        organizationId,
        page: filters?.page?.toString() || "1",
        limit: filters?.limit?.toString() || "20",
      });
      if (filters?.search && filters.search.trim()) {
        params.set("search", filters.search);
      }

      const response = await fetch(`/api/workspaces?${params}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch workspaces");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch workspaces");
      }

      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useWorkspace(workspaceId: string) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch workspace");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch workspace");
      }

      return result.data;
    },
    enabled: !!workspaceId,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const { currentOrganization, token } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreateWorkspaceData) => {
      if (!currentOrganization?.organizationId) {
        throw new Error("Missing organization context");
      }

      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...data,
          organizationId:
            data.organizationId || currentOrganization.organizationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create workspace");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to create workspace");
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}

export function useUpdateWorkspace() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      data,
    }: {
      workspaceId: string;
      data: UpdateWorkspaceData;
    }) => {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update workspace");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to update workspace");
      }

      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.invalidateQueries({
        queryKey: ["workspace", variables.workspaceId],
      });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete workspace");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to delete workspace");
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
}
