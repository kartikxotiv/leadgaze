import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  LeadPriority,
  LeadPriorityInsert,
  LeadPriorityUpdate,
} from "@/lib/data/lead-priorities";

async function parseResponse(response: Response) {
  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const errorMessage =
    payload?.error || payload?.message || response.statusText || "Request failed";

  if (!response.ok || payload?.success === false) {
    throw new Error(errorMessage);
  }

  return payload;
}

export function useLeadPriorities() {
  return useQuery({
    queryKey: ["lead-priorities"],
    queryFn: async () => {
      const response = await fetch("/api/lead-priorities");
      const payload = await parseResponse(response);
      if (!payload?.success) {
        throw new Error(payload?.error || "Failed to fetch lead priorities");
      }
      return payload.data as LeadPriority[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateLeadPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Pick<LeadPriorityInsert, "name" | "color">) => {
      const response = await fetch("/api/lead-priorities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const payload = await parseResponse(response);
      if (!payload?.success) {
        throw new Error(payload?.error || "Failed to create lead priority");
      }
      return payload.data as LeadPriority;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-priorities"] });
    },
  });
}

export function useUpdateLeadPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Pick<LeadPriorityUpdate, "name" | "color">;
    }) => {
      const response = await fetch(`/api/lead-priorities/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      const payload = await parseResponse(response);
      if (!payload?.success) {
        throw new Error(payload?.error || "Failed to update lead priority");
      }
      return payload.data as LeadPriority;
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["lead-priorities"] });
      queryClient.invalidateQueries({ queryKey: ["lead-priority", id] });
    },
  });
}

export function useDeleteLeadPriority() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/lead-priorities/${id}`, {
        method: "DELETE",
      });
      const payload = await parseResponse(response);
      if (!payload?.success) {
        throw new Error(payload?.error || "Failed to delete lead priority");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-priorities"] });
    },
  });
}
