import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";

export type MeetingAssignee = {
  id: string;
  meeting_id: string;
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

export function useMeetingAssignees(meetingId: string) {
  const { token } = useAuthStore();

  return useQuery<MeetingAssignee[]>({
    queryKey: ["meeting-assignees", meetingId],
    queryFn: async () => {
      if (!meetingId || !token) {
        throw new Error("Meeting ID or token not available");
      }

      const response = await fetch(`/api/meetings/${meetingId}/assignees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch meeting assignees");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch meeting assignees");
      }

      return result.data;
    },
    enabled: !!meetingId && !!token && meetingId !== "",
  });
}

export function useUpdateMeetingAssignees() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      userIds,
    }: {
      meetingId: string;
      userIds: string[];
    }) => {
      if (!token) {
        throw new Error("Token not available");
      }

      const response = await fetch(`/api/meetings/${meetingId}/assignees`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update meeting assignees");
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["meeting-assignees", variables.meetingId],
      });
      toast.success("Assignees updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update assignees");
    },
  });
}
