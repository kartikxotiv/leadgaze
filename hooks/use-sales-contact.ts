import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import type {
  SalesContact,
  SalesContactInsert,
  SalesContactUpdate,
} from "@/lib/data/sales-contacts";
import type { PaginationResult } from "@/lib/utils/supabase-queries";

export interface SalesContactFilters {
  search?: string;
  page?: number;
  limit?: number;
  workspaceId?: string;
  businessId?: string;
  dateFrom?: string;
  dateTo?: string;
}

function buildQueryString(filters?: SalesContactFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters?.page ?? 1));
  params.set("limit", String(filters?.limit ?? 20));
  if (filters?.search) {
    params.set("search", filters.search);
  }
  if (filters?.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }
  if (filters?.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  const filterPayload: Record<string, string> = {};
  if (filters?.workspaceId) {
    filterPayload.workspace_id = filters.workspaceId;
  }
  if (filters?.businessId) {
    filterPayload.business_id = filters.businessId;
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
  } catch {}

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

export function useSalesContacts(filters?: SalesContactFilters) {
  const { currentOrganization } = useAuthStore();
  return useQuery({
    queryKey: [
      "sales-contacts",
      currentOrganization?.organizationId,
      filters?.workspaceId,
      filters?.businessId,
      filters,
    ],
    queryFn: async () => {
      const queryString = buildQueryString(filters);
      const url = queryString
        ? `/api/sales-contacts?${queryString}`
        : "/api/sales-contacts";
      return requestJSON<PaginationResult<SalesContact>>(url);
    },
    enabled: !!filters && (!!filters.workspaceId || !!filters.businessId),
  });
}

export function useSalesContact(id: string) {
  return useQuery({
    queryKey: ["sales-contact", id],
    queryFn: () => requestJSON<SalesContact>(`/api/sales-contacts/${id}`),
    enabled: !!id,
  });
}

export function useCreateSalesContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SalesContactInsert) =>
      requestJSON<SalesContact>("/api/sales-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (data: SalesContact) => {
      queryClient.invalidateQueries({ queryKey: ["sales-contacts"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["sales-contact", data.id] });
      }
    },
  });
}

export function useUpdateSalesContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SalesContactUpdate }) =>
      requestJSON<SalesContact>(`/api/sales-contacts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: (data: SalesContact) => {
      queryClient.invalidateQueries({ queryKey: ["sales-contacts"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["sales-contact", data.id] });
      }
    },
  });
}

export function useDeleteSalesContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      requestJSON<boolean>(`/api/sales-contacts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["sales-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["sales-contact", id] });
    },
  });
}
