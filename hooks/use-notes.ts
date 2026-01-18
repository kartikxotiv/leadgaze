import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { useAuthStore } from "@/lib/stores/auth-store";

export interface Note {
  id: string;
  leadId: string;
  title: string;
  description: string;
  createdBy: string | null;
  updatedAt: string;
  createdAt: string;
  workspaceId: string;
}

export interface CreateNoteData {
  leadId: string;
  title: string;
  description: string;
  workspaceId: string;
  createdBy?: string | null;
}

export interface NoteFilters {
  leadId?: string;
  workspaceId?: string;
  page?: number;
  limit?: number;
}

function transformNote(note: any): Note {
  return {
    id: note.id,
    leadId: note.lead_id,
    title: note.title,
    description: note.description,
    createdBy: note.created_by,
    updatedAt: note.updated_at,
    createdAt: note.created_at,
    workspaceId: note.workspace_id,
  };
}

export function useNotes(filters: NoteFilters = {}) {
  const { currentWorkspace } = useWorkspaceContext();
  const workspaceId = filters.workspaceId || currentWorkspace?.id;

  return useQuery({
    queryKey: [
      "notes",
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

      if (filters.page) params.append("page", filters.page.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());

      const response = await apiClient.get(`/notes?${params.toString()}`);
      const result = (response as any).data;

      // Debug logging
      if (process.env.NODE_ENV === "development") {
        console.log("Notes API response:", result);
      }

      if (result?.data?.notes) {
        return {
          ...result,
          data: {
            ...result.data,
            notes: result.data.notes.map(transformNote),
          },
        };
      }

      // If response doesn't have the expected structure, return as is
      // The component will handle the transformation
      return result;
    },
    enabled: !!(filters.leadId || workspaceId),
  });
}

export function useNote(noteId: string) {
  return useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      const response = await apiClient.get(`/notes/${noteId}`);
      const result = (response as any).data;

      if (result?.data) {
        return {
          ...result,
          data: transformNote(result.data),
        };
      }

      return result;
    },
    enabled: !!noteId,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();

  return useMutation({
    mutationFn: async (data: CreateNoteData) => {
      if (!currentWorkspace?.id) {
        throw new Error("No workspace selected");
      }

      const payload = {
        ...data,
        workspaceId: data.workspaceId || currentWorkspace.id,
        createdBy: data.createdBy || user?.userId || null,
      };

      const response = await apiClient.post("/notes", payload);
      const result = (response as any).data;

      if (result?.data) {
        return {
          ...result,
          data: transformNote(result.data),
        };
      }

      return result;
    },
    onSuccess: (data, variables) => {
      // Invalidate all notes queries to refetch
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      if (variables.leadId) {
        queryClient.invalidateQueries({
          queryKey: ["notes", variables.leadId],
        });
      }
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      data,
    }: {
      noteId: string;
      data: Partial<CreateNoteData>;
    }) => {
      const response = await apiClient.put(`/notes/${noteId}`, data);
      const result = (response as any).data;

      if (result?.data) {
        return {
          ...result,
          data: transformNote(result.data),
        };
      }

      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["note", variables.noteId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const response = await apiClient.delete(`/notes/${noteId}`);
      return (response as any).data;
    },
    onSuccess: (data, noteId) => {
      queryClient.removeQueries({ queryKey: ["note", noteId] });
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}
