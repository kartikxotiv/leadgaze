import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";

export interface Contact {
  id: string;
  companyId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  location?: string;
  description?: string;
  contactTimeZone?: string;
  createdAt: string;
  updatedAt: string;
  company?: {
    id: string;
    title: string;
    location?: string;
  };
}

export interface ContactFilters {
  companyId?: string;
  workspaceId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateContactData {
  firstName: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  companyId?: string;
  workspaceId?: string;
  location?: string;
  description?: string;
  contactTimeZone?: string;
}

export interface UpdateContactData extends Partial<CreateContactData> {}

export function useContacts(filters?: ContactFilters) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ["contacts", filters?.companyId, filters?.workspaceId, filters],
    enabled: !!(filters?.companyId || filters?.workspaceId),
    queryFn: async () => {
      if (!filters?.companyId && !filters?.workspaceId) {
        throw new Error("Company ID or Workspace ID is required");
      }

      const params = new URLSearchParams({
        page: filters?.page?.toString() || "1",
        limit: filters?.limit?.toString() || "20",
      });
      
      if (filters?.companyId) {
        params.set("companyId", filters.companyId);
      }
      
      if (filters?.workspaceId) {
        params.set("workspaceId", filters.workspaceId);
      }
      
      if (filters?.search && filters.search.trim()) {
        params.set("search", filters.search);
      }

      const response = await fetch(`/api/contacts?${params}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch contacts");
      }

      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useContact(contactId: string) {
  const { token } = useAuthStore();

  return useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      const response = await fetch(`/api/contacts/${contactId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch contact");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch contact");
      }

      return result.data;
    },
    enabled: !!contactId,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async (data: CreateContactData) => {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create contact");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to create contact");
      }

      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      if (variables.companyId) {
        queryClient.invalidateQueries({
          queryKey: ["contacts", variables.companyId],
        });
      }
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async ({
      contactId,
      data,
    }: {
      contactId: string;
      data: UpdateContactData;
    }) => {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update contact");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to update contact");
      }

      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({
        queryKey: ["contact", variables.contactId],
      });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();

  return useMutation({
    mutationFn: async (contactId: string) => {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete contact");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to delete contact");
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

