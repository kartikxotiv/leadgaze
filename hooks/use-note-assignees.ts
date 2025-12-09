import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import { toast } from "sonner";

export type NoteAssignee = {
  id: string;
  note_id: string;
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

export function useNoteAssignees(noteId: string) {
  const { token } = useAuthStore();

  return useQuery<NoteAssignee[]>({
    queryKey: ["note-assignees", noteId],
    queryFn: async () => {
      if (!noteId || !token) {
        throw new Error("Note ID or token not available");
      }

      const response = await fetch(`/api/notes/${noteId}/assignees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch note assignees");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch note assignees");
      }

      return result.data;
    },
    enabled: !!noteId && !!token && noteId !== "",
  });
}

export function useUpdateNoteAssignees() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      userIds,
    }: {
      noteId: string;
      userIds: string[];
    }) => {
      if (!token) {
        throw new Error("Token not available");
      }

      const response = await fetch(`/api/notes/${noteId}/assignees`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update note assignees");
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["note-assignees", variables.noteId],
      });
      toast.success("Assignees updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update assignees");
    },
  });
}
