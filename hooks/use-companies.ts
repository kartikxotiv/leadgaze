import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";

export interface Company {
  id: string;
  title: string;
  description?: string;
  location?: string;
  revenue?: string;
  industry?: string;
  closeDate?: string;
  createdAt: string;
  updatedAt: string;
  contacts?: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    email?: string;
  }>;
}

export interface CompanyFilters {
  search?: string;
  page?: number;
  limit?: number;
  workspaceId?: string;
}

export interface CreateCompanyData {
  title: string;
  description?: string;
  location?: string;
  revenue?: string;
  industry?: string;
  closeDate?: string;
  workspaceId: string;
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {}

export function useCompanies(filters?: CompanyFilters) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ["companies", filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: filters?.page?.toString() || "1",
        limit: filters?.limit?.toString() || "20",
      });
      if (filters?.search && filters.search.trim()) {
        params.set("search", filters.search);
      }
      if (filters?.workspaceId) {
        params.set("workspaceId", filters.workspaceId);
      }

      const response = await fetch(`/api/companies?${params}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch companies");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch companies");
      }

      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCompany(companyId: string) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const response = await fetch(`/api/companies/${companyId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch company");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch company");
      }

      return result.data;
    },
    enabled: !!companyId,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreateCompanyData) => {
      const response = await fetch("/api/companies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create company");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to create company");
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string;
      data: UpdateCompanyData;
    }) => {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update company");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to update company");
      }

      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({
        queryKey: ["company", variables.companyId],
      });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete company");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to delete company");
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

