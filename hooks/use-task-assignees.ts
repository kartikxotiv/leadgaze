import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";

export type TaskAssignee = {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string;
  updated_at: string;
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

export function useTaskAssignees(taskId: string) {
  const { token } = useAuthStore();

  return useQuery<TaskAssignee[]>({
    queryKey: ["task-assignees", taskId],
    queryFn: async () => {
      if (!taskId || !token) {
        throw new Error("Task ID or token not available");
      }

      const response = await fetch(`/api/tasks/${taskId}/assignees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch task assignees");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch task assignees");
      }

      return result.data;
    },
    enabled: !!taskId && !!token,
  });
}

export function useUpdateTaskAssignees() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      userIds,
    }: {
      taskId: string;
      userIds: string[];
    }) => {
      if (!token) {
        throw new Error("Token not available");
      }

      const response = await fetch(`/api/tasks/${taskId}/assignees`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update task assignees");
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task-assignees", variables.taskId],
      });
      toast.success("Assignees updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update assignees");
    },
  });
}

export function useAddTaskAssignee() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
    }: {
      taskId: string;
      userId: string;
    }) => {
      if (!token) {
        throw new Error("Token not available");
      }

      const response = await fetch(`/api/tasks/${taskId}/assignees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add assignee");
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task-assignees", variables.taskId],
      });
      toast.success("Assignee added successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to add assignee");
    },
  });
}

export function useRemoveTaskAssignee() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      userId,
    }: {
      taskId: string;
      userId: string;
    }) => {
      if (!token) {
        throw new Error("Token not available");
      }

      const response = await fetch(
        `/api/tasks/${taskId}/assignees?userId=${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove assignee");
      }

      return true;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["task-assignees", variables.taskId],
      });
      toast.success("Assignee removed successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to remove assignee");
    },
  });
}
