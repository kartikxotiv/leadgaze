import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";

export interface Meeting {
  id: string;
  leadId: string | null;
  title: string;
  description: string | null;
  meetingNotes: string | null;
  time: string;
  link: string | null;
  type: string | null;
  createdBy: string | null;
  updatedAt: string;
  createdAt: string;
}

export interface CreateMeetingData {
  leadId?: string | null;
  title: string;
  description?: string | null;
  meetingNotes?: string | null;
  time: string;
  link?: string | null;
  type?: string | null;
  createdBy?: string | null;
}

export interface MeetingFilters {
  leadId?: string;
  page?: number;
  limit?: number;
}

function transformMeeting(meeting: any): Meeting {
  return {
    id: meeting.id,
    leadId: meeting.lead_id,
    title: meeting.title,
    description: meeting.description,
    meetingNotes: meeting.meeting_notes,
    time: meeting.time,
    link: meeting.link,
    type: meeting.type,
    createdBy: meeting.created_by,
    updatedAt: meeting.updated_at,
    createdAt: meeting.created_at,
  };
}

export function useMeetings(filters: MeetingFilters = {}) {
  return useQuery({
    queryKey: ["meetings", filters.leadId, filters.page, filters.limit],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.leadId) {
        params.append("leadId", filters.leadId);
      }

      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());

      const response = await apiClient.get(`/meetings?${params.toString()}`);
      const result = (response as any).data;

      // Debug logging
      if (process.env.NODE_ENV === "development") {
        console.log("Meetings API response:", result);
      }

      if (result?.data?.meetings) {
        return {
          ...result,
          data: {
            ...result.data,
            meetings: result.data.meetings.map(transformMeeting),
          },
        };
      }

      return result;
    },
    enabled: true,
  });
}

export function useMeeting(meetingId: string) {
  return useQuery({
    queryKey: ["meeting", meetingId],
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${meetingId}`);
      const result = response as any;

      // API returns { success: true, data: meeting }
      // where meeting is in snake_case format
      if (result?.success && result?.data) {
        return {
          ...result,
          data: transformMeeting(result.data),
        };
      }

      // Fallback: if response structure is different
      if (result?.data) {
        return {
          success: true,
          data: transformMeeting(result.data),
        };
      }

      return result;
    },
    enabled: !!meetingId,
  });
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreateMeetingData) => {
      const payload = {
        ...data,
        createdBy: data.createdBy || user?.userId || null,
      };

      const response = await apiClient.post("/meetings", payload);
      const result = (response as any).data;

      if (result?.data) {
        return {
          ...result,
          data: transformMeeting(result.data),
        };
      }

      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate all meetings queries to refetch
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      if (variables.leadId) {
        queryClient.invalidateQueries({
          queryKey: ["meetings", variables.leadId],
        });
      }
    },
  });
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meetingId,
      data,
    }: {
      meetingId: string;
      data: Partial<CreateMeetingData>;
    }) => {
      const response = await apiClient.put(`/meetings/${meetingId}`, data);
      const result = (response as any).data;

      if (result?.data) {
        return {
          ...result,
          data: transformMeeting(result.data),
        };
      }

      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["meeting", variables.meetingId],
      });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}

export function useDeleteMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meetingId: string) => {
      const response = await apiClient.delete(`/meetings/${meetingId}`);
      return (response as any).data;
    },
    onSuccess: (data, meetingId) => {
      queryClient.removeQueries({ queryKey: ["meeting", meetingId] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });
}
