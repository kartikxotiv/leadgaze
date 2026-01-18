import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { LeadComment } from "@/lib/data/lead-comments";

interface LeadCommentInput {
  leadId: string;
  comment: string;
  createdBy?: string | null;
}

export function useLeadComments(leadId?: string) {
  return useQuery({
    queryKey: ["lead-comments", leadId],
    enabled: !!leadId,
    queryFn: async () => {
      const response = await fetch(`/api/lead-comments?leadId=${leadId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch lead comments");
      }
      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.error || "Failed to fetch lead comments");
      }

      return payload.data as LeadComment[];
    },
  });
}

export function useCreateLeadComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, comment, createdBy }: LeadCommentInput) => {
      const response = await fetch(`/api/lead-comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment, createdBy, leadId }),
      });

      if (!response.ok) {
        throw new Error("Failed to create comment");
      }

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.error || "Failed to create comment");
      }

      return payload.data as LeadComment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lead-comments", variables.leadId],
      });
    },
  });
}

export function useUpdateLeadComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      comment,
      leadId,
    }: {
      commentId: string;
      comment: string;
      leadId: string;
    }) => {
      const response = await fetch(`/api/lead-comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });

      if (!response.ok) {
        throw new Error("Failed to update comment");
      }

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.error || "Failed to update comment");
      }

      return payload.data as LeadComment;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lead-comments", variables.leadId],
      });
    },
  });
}

export function useDeleteLeadComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      leadId,
    }: {
      commentId: string;
      leadId: string;
    }) => {
      const response = await fetch(`/api/lead-comments/${commentId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete comment");
      }

      const payload = await response.json();
      if (!payload?.success) {
        throw new Error(payload?.error || "Failed to delete comment");
      }

      return true;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["lead-comments", variables.leadId],
      });
    },
  });
}
