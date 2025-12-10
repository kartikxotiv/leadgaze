import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import type {
  Business,
  BusinessInsert,
  BusinessUpdate,
} from "@/lib/data/business";
import type { PaginationResult } from "@/lib/utils/supabase-queries";

export interface BusinessFilters {
  search?: string;
  page?: number;
  limit?: number;
  business_type?: string;
  industry?: string;
  business_country?: string;
  account_owner?: string;
}

function buildQueryString(filters?: BusinessFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(filters?.page ?? 1));
  params.set("limit", String(filters?.limit ?? 20));

  if (filters?.search) {
    params.set("search", filters.search);
  }

  const filterPayload: Record<string, string | string[]> = {};
  if (filters?.business_type) {
    filterPayload.business_type = filters.business_type;
  }
  if (filters?.industry) {
    filterPayload.industry = filters.industry;
  }
  if (filters?.business_country) {
    filterPayload.business_country = filters.business_country;
  }
  if (filters?.account_owner) {
    filterPayload.account_owner = filters.account_owner;
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

export function useBusinesses(filters?: BusinessFilters) {
  const { currentOrganization, token } = useAuthStore();
  return useQuery({
    queryKey: ["businesses", currentOrganization?.organizationId, filters],
    queryFn: async () => {
      const queryString = buildQueryString(filters);
      const url = queryString
        ? `/api/business?${queryString}`
        : "/api/business";
      return requestJSON<PaginationResult<Business>>(url, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    },
    enabled: !!filters,
  });
}

export function useBusiness(businessId: string) {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ["business", businessId],
    queryFn: () =>
      requestJSON<Business | null>(`/api/business/${businessId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }),
    enabled: !!businessId,
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  return useMutation({
    mutationFn: (data: BusinessInsert) =>
      requestJSON<Business>("/api/business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      }),
    onSuccess: (data: Business) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["business", data.id] });
      }
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BusinessUpdate }) =>
      requestJSON<Business>(`/api/business/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      }),
    onSuccess: (data: Business) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      if (data?.id) {
        queryClient.invalidateQueries({ queryKey: ["business", data.id] });
      }
    },
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  return useMutation({
    mutationFn: (id: string) =>
      requestJSON<boolean>(`/api/business/${id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      }),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["businesses"] });
      queryClient.invalidateQueries({ queryKey: ["business", id] });
    },
  });
}
