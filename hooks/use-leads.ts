import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";

export interface Lead {
  leadId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email?: string;
  altEmail?: string;
  phone?: string;
  altPhone?: string;
  linkedinProfile?: string;
  businessName?: string;
  companyWebsite?: string;
  jobTitle?: string;
  productInterest?: string;
  tags?: string[];
  statusId: string;
  sourceId: string;
  industryId?: string;
  companySizeId?: string;
  assignedTo?: string;
  createdBy: string;
  leadScore: number;
  scoreGradeId?: string;
  qualificationNotes?: string;
  lastContactDate?: string;
  nextFollowupDate?: string;
  metaData?: any;
  createdAt: string;
  updatedAt: string;

 
  status: {
    entityValue: string;
    description: string;
  };
  source: {
    entityValue: string;
    description: string;
  };
  industry?: {
    entityValue: string;
    description: string;
  };
  companySize?: {
    entityValue: string;
    description: string;
  };
  scoreGrade?: {
    entityValue: string;
    description: string;
    metadata?: any;
  };
  assignedUser?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  createdUser?: {
    firstName: string;
    lastName: string;
  };
  scoreData?: {
    totalScore: number;
    tier: string;
    lastCalculated: string;
  };
  activities?: Activity[];
}

export interface Activity {
  activityId: string;
  activityType: string;
  subject: string;
  description?: string;
  outcome?: string;
  durationMinutes?: number;
  activityDate: string;
  performedByUser?: {
    firstName: string;
    lastName: string;
  };
}

export interface LeadConfig {
  id: string;
  value: string;
  label: string;
  displayOrder?: number;
  metadata?: any;
}

export interface LeadFilters {
  status?: string;
  source?: string;
  assignedTo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateLeadData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  businessName?: string;
  companyWebsite?: string;
  sourceId: string;
  industryId?: string;
  companySizeId?: string;
  productInterest?: string;
  tags?: string[];
  assignedTo?: string;
  notes?: string;
}

export interface UpdateLeadData extends Partial<CreateLeadData> {
  statusId?: string;
  leadScore?: number;
  qualificationNotes?: string;
  nextFollowupDate?: string;
}

export function useLeads(filters?: LeadFilters) {
  const { currentOrganization, token } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery({
    queryKey: [
      "leads",
      currentOrganization?.organizationId,
      currentWorkspace?.id || null,
      filters,
    ],
    enabled:
      isReady && isAuthenticated && !!currentOrganization?.organizationId,
    queryFn: async () => {
      if (!currentOrganization?.organizationId) {
        throw new Error("No organization selected");
      }

      const params = new URLSearchParams({
        organizationId: currentOrganization.organizationId,
        page: filters?.page?.toString() || "1",
        limit: filters?.limit?.toString() || "20",
      });
      if (filters?.status) params.set("status", filters.status);
      if (filters?.source) params.set("source", filters.source);
      if (filters?.assignedTo) params.set("assignedTo", filters.assignedTo);
      if (filters?.search && filters.search.trim()) params.set("search", filters.search);
      if (currentWorkspace?.id) {
        params.set("workspaceId", currentWorkspace.id);
      }

      const response = await fetch(`/api/leads?${params}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch leads");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch leads");
      }

     
      const workspaceId = currentWorkspace?.id;
      if (workspaceId) {
        const data = result.data;
        if (Array.isArray(data)) {
          return data.filter(
            (lead: any) => lead?.metaData?.workspaceId === workspaceId
          );
        }
        if (data && Array.isArray(data.leads)) {
          return {
            ...data,
            leads: data.leads.filter(
              (lead: any) => lead?.metaData?.workspaceId === workspaceId
            ),
          };
        }
      }

      return result.data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useLead(leadId: string) {
  return useQuery({
    queryKey: ["lead", leadId],
    queryFn: async () => {
      const { token } = useAuthStore.getState();
      const response = await fetch(`/api/leads/${leadId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch lead");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch lead");
      }

      return result.data;
    },
    enabled: !!leadId,
  });
}

export function useLeadConfigs(entityType?: string) {
  return useQuery({
    queryKey: ["lead-configs", entityType],
    queryFn: async () => {
      const params = entityType ? `?entityType=${entityType}` : "";
      const response = await fetch(`/api/leads/config${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch lead configurations");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch lead configurations");
      }

      return result.data;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { currentOrganization, user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();

  return useMutation({
    mutationFn: async (data: CreateLeadData) => {
      if (!currentOrganization?.organizationId || !user?.userId) {
        throw new Error("Missing organization or user context");
      }

      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(useAuthStore.getState().token
            ? { Authorization: `Bearer ${useAuthStore.getState().token}` }
            : {}),
        },
        body: JSON.stringify({
          ...data,
          jobTitle: data.jobTitle,
          qualificationNotes: data.notes,
          organizationId: currentOrganization.organizationId,
          createdBy: user.userId,
         
          metaData: currentWorkspace?.id
            ? { workspaceId: currentWorkspace.id }
            : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create lead");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to create lead");
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      data,
    }: {
      leadId: string;
      data: UpdateLeadData;
    }) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(useAuthStore.getState().token
            ? { Authorization: `Bearer ${useAuthStore.getState().token}` }
            : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update lead");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to update lead");
      }

      return result.data;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
        headers: {
          ...(useAuthStore.getState().token
            ? { Authorization: `Bearer ${useAuthStore.getState().token}` }
            : {}),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete lead");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to delete lead");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}
