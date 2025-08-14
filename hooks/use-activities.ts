import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";

export interface Activity {
  activityId: string;
  activityType:
    | "call"
    | "email"
    | "linkedin"
    | "meeting"
    | "task"
    | "note"
    | "demo"
    | "proposal_sent"
    | "lead_created"
    | "lead_updated"
    | "status_changed"
    | "score_updated"
    | "deal_created"
    | "deal_moved"
    | "task_created"
    | "task_completed"
    | "follow_up_scheduled";
  relatedType: "lead" | "deal" | "contact" | "company";
  relatedId: string;
  subject: string;
  description?: string;
  outcome?: string;
  direction?: "inbound" | "outbound";
  durationMinutes?: number;
  scheduledAt?: string;
  completedAt?: string;
  dueDate?: string;
  priority: "low" | "medium" | "high" | "urgent";
  userId: string;
  nextFollowupDate?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  lead?: {
    leadId: string;
    firstName: string;
    lastName: string;
    businessName: string;
  };
}

export interface CreateActivityData {
  activityType: Activity["activityType"];
  relatedType: Activity["relatedType"];
  relatedId: string;
  subject: string;
  description?: string;
  outcome?: string;
  direction?: "inbound" | "outbound";
  durationMinutes?: number;
  scheduledAt?: string;
  completedAt?: string;
  dueDate?: string;
  priority?: Activity["priority"];
  nextFollowupDate?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  metadata?: any;
}

export interface ActivityFilters {
  relatedType?: string;
  relatedId?: string;
  activityType?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}

// Hook to fetch activities with filters
export function useActivities(filters: ActivityFilters = {}) {
  const { currentOrganization, token } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();

  return useQuery({
    queryKey: ["activities", filters, currentOrganization?.organizationId],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.relatedType)
        params.append("relatedType", filters.relatedType);
      if (filters.relatedId) params.append("relatedId", filters.relatedId);
      if (filters.activityType)
        params.append("activityType", filters.activityType);
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.offset) params.append("offset", filters.offset.toString());

      const response = await apiClient.get(`/activities?${params.toString()}`);
      return (response as any).data;
    },
    enabled:
      isReady &&
      isAuthenticated &&
      !!currentOrganization?.organizationId &&
      !!token,
  });
}

// Hook to fetch single activity
export function useActivity(activityId: string) {
  return useQuery({
    queryKey: ["activity", activityId],
    queryFn: async () => {
      const response = await apiClient.get(`/activities/${activityId}`);
      return (response as any).data;
    },
    enabled: !!activityId,
  });
}

// Hook to create activity
export function useCreateActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();

  return useMutation({
    mutationFn: async (data: CreateActivityData) => {
      if (!isReady || !isAuthenticated || !user?.userId) {
        throw new Error("User authentication required");
      }

      const payload = {
        ...data,
        userId: user.userId,
      };

      console.log("Creating activity with payload:", payload);

      const response = await apiClient.post("/activities", payload);
      return (response as any).data;
    },
    onSuccess: (data, variables) => {
      // Invalidate activities queries
      queryClient.invalidateQueries({ queryKey: ["activities"] });

      // If it's a lead-related activity, invalidate lead activities
      if (variables.relatedType === "lead") {
        queryClient.invalidateQueries({
          queryKey: [
            "activities",
            { relatedType: "lead", relatedId: variables.relatedId },
          ],
        });
      }
    },
  });
}

// Hook to update activity
export function useUpdateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      activityId,
      data,
    }: {
      activityId: string;
      data: Partial<CreateActivityData>;
    }) => {
      const response = await apiClient.put(`/activities/${activityId}`, data);
      return (response as any).data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific activity
      queryClient.invalidateQueries({
        queryKey: ["activity", variables.activityId],
      });

      // Invalidate activities list
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

// Hook to delete activity
export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) => {
      const response = await apiClient.delete(`/activities/${activityId}`);
      return (response as any).data;
    },
    onSuccess: (data, activityId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["activity", activityId] });

      // Invalidate activities list
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });
}

// Hook to get activities for a specific lead
export function useLeadActivities(leadId: string) {
  return useActivities({
    relatedType: "lead",
    relatedId: leadId,
    limit: 100,
  });
}

// Hook to get today's follow-ups
export function useTodaysFollowUps() {
  const { user } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return useQuery({
    queryKey: ["followups", "today", user?.userId],
    queryFn: async () => {
      if (!user?.userId) {
        throw new Error("User ID is required for fetching follow-ups");
      }

      const params = new URLSearchParams({
        userId: user.userId,
        activityType: "task",
        limit: "100",
      });

      console.log(
        "Fetching today's follow-ups with params:",
        params.toString()
      );

      const response = await apiClient.get(`/activities?${params.toString()}`);

      // Filter for today's follow-ups on the client side
      const activities = (response as any).data?.activities || [];
      return activities.filter((activity: Activity) => {
        if (!activity.dueDate) return false;
        const dueDate = new Date(activity.dueDate);
        return dueDate >= today && dueDate < tomorrow;
      });
    },
    enabled: isReady && isAuthenticated && !!user?.userId,
  });
}

// Hook to get upcoming follow-ups (next 7 days)
export function useUpcomingFollowUps() {
  const { user } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);
  nextWeek.setHours(23, 59, 59, 999);

  return useQuery({
    queryKey: ["followups", "upcoming", user?.userId],
    queryFn: async () => {
      if (!user?.userId) {
        throw new Error("User ID is required for fetching upcoming follow-ups");
      }

      const params = new URLSearchParams({
        userId: user.userId,
        activityType: "task",
        limit: "100",
      });

      console.log(
        "Fetching upcoming follow-ups with params:",
        params.toString()
      );

      const response = await apiClient.get(`/activities?${params.toString()}`);

      // Filter for upcoming follow-ups (tomorrow to next 7 days)
      const activities = (response as any).data?.activities || [];
      return activities.filter((activity: Activity) => {
        if (!activity.dueDate || activity.completedAt) return false;
        const dueDate = new Date(activity.dueDate);
        return dueDate > today && dueDate <= nextWeek;
      });
    },
    enabled: isReady && isAuthenticated && !!user?.userId,
  });
}

// Hook to get overdue follow-ups
export function useOverdueFollowUps() {
  const { user } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return useQuery({
    queryKey: ["followups", "overdue", user?.userId],
    queryFn: async () => {
      if (!user?.userId) {
        throw new Error("User ID is required for fetching overdue follow-ups");
      }

      const params = new URLSearchParams({
        userId: user.userId,
        activityType: "task",
        limit: "100",
      });

      console.log(
        "Fetching overdue follow-ups with params:",
        params.toString()
      );

      const response = await apiClient.get(`/activities?${params.toString()}`);

      // Filter for overdue follow-ups on the client side
      const activities = (response as any).data?.activities || [];
      return activities.filter((activity: Activity) => {
        if (!activity.dueDate || activity.completedAt) return false;
        const dueDate = new Date(activity.dueDate);
        return dueDate < today;
      });
    },
    enabled: isReady && isAuthenticated && !!user?.userId,
  });
}
