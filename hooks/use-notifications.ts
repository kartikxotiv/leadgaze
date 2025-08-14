import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";

export interface Notification {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high" | "urgent";
  channel: "in_app" | "email" | "slack" | "sms";
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  actionLabel?: string;
  relatedType?: "lead" | "deal" | "task" | "activity" | "user";
  relatedId?: string;
  organizationId: string;
  sentAt?: string;
  expiresAt?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNotificationData {
  type: string;
  title: string;
  message: string;
  priority?: "low" | "medium" | "high" | "urgent";
  channel?: "in_app" | "email" | "slack" | "sms";
  actionUrl?: string;
  actionLabel?: string;
  relatedType?: "lead" | "deal" | "task" | "activity" | "user";
  relatedId?: string;
  expiresAt?: string;
  metadata?: any;
}

// Hook to fetch user notifications
export function useNotifications(
  options: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    types?: string[];
  } = {}
) {
  const { user } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();

  return useQuery({
    queryKey: ["notifications", user?.userId, options],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (options.limit) params.append("limit", options.limit.toString());
      if (options.offset) params.append("offset", options.offset.toString());
      if (options.unreadOnly) params.append("unreadOnly", "true");
      if (options.types) {
        options.types.forEach((type) => params.append("types", type));
      }

      const response = await apiClient.get(
        `/api/notifications?${params.toString()}`
      );
      return response.data;
    },
    enabled: isReady && isAuthenticated && !!user?.userId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
}

// Hook to get unread notification count
export function useUnreadNotificationCount() {
  const { user } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();

  return useQuery({
    queryKey: ["notifications", "unread-count", user?.userId],
    enabled: isReady && isAuthenticated && !!user?.userId,
    queryFn: async () => {
      const response = await apiClient.get("/notifications/unread-count");
      return response.data;
    },
    refetchInterval: 15000, // Refetch every 15 seconds
  });
}

// Hook to mark notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.patch(
        `/api/notifications/${notificationId}/read`
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate notifications queries
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook to mark all notifications as read
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.patch("/notifications/read-all");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook to send notification
export function useSendNotification() {
  const queryClient = useQueryClient();
  const { user, organizationId } = useAuthStore();

  return useMutation({
    mutationFn: async (
      data: CreateNotificationData & { targetUserId: string }
    ) => {
      const payload = {
        ...data,
        organizationId,
      };

      const response = await apiClient.post("/notifications", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook to delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiClient.delete(
        `/api/notifications/${notificationId}`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// Hook to get notification settings
export function useNotificationSettings() {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["notification-settings", user?.userId],
    queryFn: async () => {
      const response = await apiClient.get("/notifications/settings");
      return response.data;
    },
    enabled: !!user?.userId,
  });
}

// Hook to update notification settings
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: any) => {
      const response = await apiClient.patch(
        "/api/notifications/settings",
        settings
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
    },
  });
}

// Utility function to get notification icon
export function getNotificationIcon(type: string) {
  const icons = {
    lead_assigned: "👤",
    follow_up_due: "⏰",
    lead_stale: "📢",
    lead_scored_high: "🔥",
    deal_moved: "📊",
    deal_stuck: "🚨",
    task_overdue: "⚠️",
    activity_reminder: "📅",
    system_update: "🔄",
    bulk_import_complete: "📥",
    escalation: "🚩",
  };

  return icons[type as keyof typeof icons] || "📨";
}

// Utility function to get priority color
export function getPriorityColor(priority: string) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "low":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Utility function to format notification time
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString();
}
