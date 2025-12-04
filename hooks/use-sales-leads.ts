import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import type {
  SalesLead,
  SalesLeadInsert,
  SalesLeadUpdate,
  SalesLeadWithRelations,
} from "@/lib/data/sales-leads";
import type { PaginationResult } from "@/lib/utils/supabase-queries";

export interface SalesLeadFilters {
  search?: string;
  page?: number;
  limit?: number;
  workspaceId?: string;
  status?: string;
  ownerId?: string;
  priorityId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildQueryString(filters?: SalesLeadFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters?.page ?? 1));
  params.set("limit", String(filters?.limit ?? 20));

  if (filters?.search) {
    params.set("search", filters.search);
  }

  const filterPayload: Record<string, string | string[]> = {};
  if (filters?.workspaceId) {
    filterPayload.workspace_id = filters.workspaceId;
  }
  if (filters?.status) {
    filterPayload.status = filters.status;
  }
  if (filters?.ownerId) {
    filterPayload.owner_id = filters.ownerId;
  }
  if (filters?.priorityId) {
    filterPayload.priority = filters.priorityId;
  }
  if (filters?.dateFrom) {
    filterPayload.date_from = filters.dateFrom;
  }
  if (filters?.dateTo) {
    filterPayload.date_to = filters.dateTo;
  }

  if (Object.keys(filterPayload).length > 0) {
    params.set("filters", JSON.stringify(filterPayload));
  }

  return params.toString();
}

async function requestJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let payload: any = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const errorMessage =
    payload?.error ||
    payload?.message ||
    response.statusText ||
    "Request failed";

  if (!response.ok || payload?.success === false) {
    throw new Error(errorMessage);
  }

  return (payload?.data ?? payload) as T;
}

export function useSalesLeads(filters?: SalesLeadFilters) {
  const { currentOrganization, token } = useAuthStore();
  return useQuery({
    queryKey: [
      "sales-leads",
      currentOrganization?.organizationId,
      filters?.workspaceId,
      filters,
    ],
    queryFn: async () => {
      const queryString = buildQueryString(filters);
      const url = queryString
        ? `/api/sales-leads?${queryString}`
        : "/api/sales-leads";
      return requestJSON<PaginationResult<SalesLead>>(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    enabled: !!filters,
  });
}

export function useSalesLead(leadId: string) {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["sales-lead", leadId],
    queryFn: () =>
      requestJSON<SalesLeadWithRelations | null>(`/api/sales-leads/${leadId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }),
    enabled: !!leadId,
  });
}

export function useCreateSalesLead() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  return useMutation({
    mutationFn: (data: SalesLeadInsert) =>
      requestJSON<SalesLead>("/api/sales-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      }),
    onSuccess: (data: SalesLead) => {
      queryClient.invalidateQueries({ queryKey: ["sales-leads"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["sales-lead", data.id] });
      }
    },
  });
}

export function useUpdateSalesLead() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SalesLeadUpdate }) =>
      requestJSON<SalesLead>(`/api/sales-leads/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      }),
    onSuccess: (data: SalesLead) => {
      queryClient.invalidateQueries({ queryKey: ["sales-leads"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["sales-lead", data.id] });
      }
    },
  });
}

export function useDeleteSalesLead() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  return useMutation({
    mutationFn: (id: string) =>
      requestJSON<boolean>(`/api/sales-leads/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["sales-leads"] });
      queryClient.invalidateQueries({ queryKey: ["sales-lead", id] });
    },
  });
}
