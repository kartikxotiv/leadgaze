import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient as ApiClient } from "@/lib/api-client";
import { Workspace } from "@/lib/types";
import { toast } from "sonner";

// API functions
const workspaceApi = {
  // Get all workspaces for an organization
  getWorkspaces: async (organizationId: string): Promise<Workspace[]> => {
    const response = (await ApiClient.get(
      `/organizations/${organizationId}/workspaces`
    )) as { workspaces: Workspace[] };
    return response.workspaces;
  },

  // Get specific workspace
  getWorkspace: async (
    organizationId: string,
    workspaceId: string
  ): Promise<Workspace> => {
    const response = (await ApiClient.get(
      `/organizations/${organizationId}/workspaces/${workspaceId}`
    )) as { workspace: Workspace };
    return response.workspace;
  },

  // Create new workspace
  createWorkspace: async (
    organizationId: string,
    data: { name: string; description?: string }
  ): Promise<Workspace> => {
    const response = (await ApiClient.post(
      `/organizations/${organizationId}/workspaces`,
      data
    )) as { workspace: Workspace };
    return response.workspace;
  },

  // Update workspace
  updateWorkspace: async (
    organizationId: string,
    workspaceId: string,
    data: {
      name?: string;
      description?: string;
      status?: "active" | "inactive" | "archived";
    }
  ): Promise<Workspace> => {
    const response = (await ApiClient.put(
      `/organizations/${organizationId}/workspaces/${workspaceId}`,
      data
    )) as { workspace: Workspace };
    return response.workspace;
  },

  // Delete workspace (archive)
  deleteWorkspace: async (
    organizationId: string,
    workspaceId: string
  ): Promise<void> => {
    await ApiClient.delete(
      `/organizations/${organizationId}/workspaces/${workspaceId}`
    );
  },
};

// Hooks
export function useWorkspaces(
  organizationId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["workspaces", organizationId],
    queryFn: () => workspaceApi.getWorkspaces(organizationId),
    enabled: !!organizationId && options?.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useWorkspace(organizationId: string, workspaceId: string) {
  return useQuery({
    queryKey: ["workspace", organizationId, workspaceId],
    queryFn: () => workspaceApi.getWorkspace(organizationId, workspaceId),
    enabled: !!organizationId && !!workspaceId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateWorkspace(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      workspaceApi.createWorkspace(organizationId, data),
    onSuccess: (newWorkspace) => {
      // Update the workspaces list in cache
      queryClient.setQueryData(
        ["workspaces", organizationId],
        (oldData: Workspace[] | undefined) => {
          if (!oldData) return [newWorkspace];
          return [newWorkspace, ...oldData];
        }
      );

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ["workspaces", organizationId],
      });

      toast.success(`Workspace "${newWorkspace.name}" created successfully!`);
    },
    onError: (error: any) => {
      console.error("Failed to create workspace:", error);
      toast.error(
        error.message || "Failed to create workspace. Please try again."
      );
    },
  });
}

export function useUpdateWorkspace(
  organizationId: string,
  workspaceId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      name?: string;
      description?: string;
      status?: "active" | "inactive" | "archived";
    }) => workspaceApi.updateWorkspace(organizationId, workspaceId, data),
    onSuccess: (updatedWorkspace) => {
      // Update the workspace in cache
      queryClient.setQueryData(
        ["workspace", organizationId, workspaceId],
        updatedWorkspace
      );

      // Update the workspaces list in cache
      queryClient.setQueryData(
        ["workspaces", organizationId],
        (oldData: Workspace[] | undefined) => {
          if (!oldData) return [updatedWorkspace];
          return oldData.map((workspace) =>
            workspace.id === workspaceId ? updatedWorkspace : workspace
          );
        }
      );

      toast.success(
        `Workspace "${updatedWorkspace.name}" updated successfully!`
      );
    },
    onError: (error: any) => {
      console.error("Failed to update workspace:", error);
      toast.error(
        error.message || "Failed to update workspace. Please try again."
      );
    },
  });
}

export function useDeleteWorkspace(organizationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId: string) =>
      workspaceApi.deleteWorkspace(organizationId, workspaceId),
    onSuccess: (_, workspaceId) => {
      // Remove workspace from cache
      queryClient.setQueryData(
        ["workspaces", organizationId],
        (oldData: Workspace[] | undefined) => {
          if (!oldData) return [];
          return oldData.filter((workspace) => workspace.id !== workspaceId);
        }
      );

      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({
        queryKey: ["workspaces", organizationId],
      });

      toast.success("Workspace archived successfully!");
    },
    onError: (error: any) => {
      console.error("Failed to delete workspace:", error);
      toast.error(
        error.message || "Failed to delete workspace. Please try again."
      );
    },
  });
}
