import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { useAuthStore } from "@/lib/stores/auth-store";

export interface Reminder {
  id: string;
  leadId: string;
  content: string;
  remindAt: string;
  createdBy: string | null;
  workspaceId: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface CreateReminderData {
  leadId: string;
  content: string;
  remindAt: string;
  workspaceId?: string;
  createdBy?: string | null;
}

export interface ReminderFilters {
  leadId?: string;
  workspaceId?: string;
  page?: number;
  limit?: number;
}

function transformReminder(reminder: any): Reminder {
  return {
    id: reminder.id,
    leadId: reminder.lead_id,
    content: reminder.content,
    remindAt: reminder.remind_at,
    createdBy: reminder.created_by,
    workspaceId: reminder.workspace_id ?? null,
    updatedAt: reminder.updated_at,
    createdAt: reminder.created_at,
  };
}

export function useReminders(filters: ReminderFilters = {}) {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = filters.workspaceId || currentWorkspace?.id;

  return useQuery({
    queryKey: [
      "reminders",
      filters.leadId,
      workspaceId,
      filters.page,
      filters.limit,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.leadId) {
        params.append("leadId", filters.leadId);
      } else if (workspaceId) {
        params.append("workspaceId", workspaceId);
      } else {
        throw new Error("Either leadId or workspaceId is required");
      }
      if (filters.page) params.append("page", String(filters.page));
      if (filters.limit) params.append("limit", String(filters.limit));

      const response = await apiClient.get(`/reminders?${params.toString()}`);
      const result = response as any;

      // Structure: { success: true, data: { reminders: [...] } }
      if (result?.data?.reminders && Array.isArray(result.data.reminders)) {
        return {
          ...result,
          data: {
            ...result.data,
            reminders: result.data.reminders.map(transformReminder),
          },
        };
      }

      // Structure: { success: true, data: [...] }
      if (Array.isArray(result?.data)) {
        return {
          ...result,
          data: result.data.map(transformReminder),
        };
      }

      // Structure: [...]
      if (Array.isArray(result)) {
        return result.map(transformReminder);
      }

      return result;
    },
    enabled: !!(filters.leadId || workspaceId),
  });
}

export function useCreateReminder() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();

  return useMutation({
    mutationFn: async (data: CreateReminderData) => {
      const payload = {
        ...data,
        workspaceId: data.workspaceId || currentWorkspace?.id,
        createdBy: data.createdBy ?? user?.userId ?? null,
      };
      const response = await apiClient.post("/reminders", payload);
      const result = response as any;
      if (result?.data) {
        return {
          ...result,
          data: transformReminder(result.data),
        };
      }
      if (result?.id) {
        return transformReminder(result);
      }
      return result;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      if (variables.leadId) {
        queryClient.invalidateQueries({
          queryKey: ["reminders", variables.leadId],
        });
      }
    },
  });
}

export function useUpdateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      reminderId,
      data,
    }: {
      reminderId: string;
      data: Partial<CreateReminderData>;
    }) => {
      const response = await apiClient.put(`/reminders/${reminderId}`, data);
      const result = response as any;
      if (result?.data) {
        return {
          ...result,
          data: transformReminder(result.data),
        };
      }
      if (result?.id) {
        return transformReminder(result);
      }
      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
      queryClient.invalidateQueries({
        queryKey: ["reminders", variables.reminderId],
      });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reminderId: string) => {
      const response = await apiClient.delete(`/reminders/${reminderId}`);
      return (response as any).data;
    },
    onSuccess: (_data, reminderId) => {
      queryClient.removeQueries({ queryKey: ["reminders", reminderId] });
      queryClient.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}
