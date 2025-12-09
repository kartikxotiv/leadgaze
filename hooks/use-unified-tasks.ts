import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWorkspaceContext } from "./use-workspace-context";
import { toast } from "sonner";

export type UnifiedTask = {
  id: string;
  type: "note" | "meeting" | "task";
  title: string;
  description: string | null;
  status: string;
  workspace_id: string | null;
  lead_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  time?: string;
  due_date?: string | null;
  priority?: string;
  meeting_notes?: string | null;
  link?: string | null;
};

export function useUnifiedTasks() {
  const { token } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery<UnifiedTask[]>({
    queryKey: ["unified-tasks", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !token) {
        throw new Error("Workspace or token not available");
      }

      const response = await fetch(
        `/api/tasks/unified?workspaceId=${currentWorkspace.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch unified tasks");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch unified tasks");
      }

      return result.data;
    },
    enabled: !!currentWorkspace?.id && !!token,
    staleTime: 0, // Always refetch to get latest data
  });
}

export function useUpdateTaskStatus() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspaceContext();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: "NEW" | "INPROGRESS" | "DONE";
    }) => {
      if (!token) {
        throw new Error("Token not available");
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update task status");
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      // Invalidate and refetch to ensure UI updates immediately
      queryClient.invalidateQueries({
        queryKey: ["unified-tasks", currentWorkspace?.id],
      });
      queryClient.refetchQueries({
        queryKey: ["unified-tasks", currentWorkspace?.id],
      });
      toast.success("Task status updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task status");
    },
  });
}
