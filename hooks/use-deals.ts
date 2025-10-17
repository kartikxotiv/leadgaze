import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";

export interface Deal {
  dealId: string;
  leadId: string;
  title: string;
  description?: string;
  value: number;
  currency: string;
  stage:
    | "qualification"
    | "proposal"
    | "negotiation"
    | "decision"
    | "closed_won"
    | "closed_lost";
  probability: number;
  source?: string;
  priority: "low" | "medium" | "high" | "urgent";
  expectedCloseDate?: string;
  actualCloseDate?: string;
  lostReason?: string;
  userId: string;
  organizationId: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  lead?: {
    leadId: string;
    firstName: string;
    lastName: string;
    businessName: string;
    email: string;
    phone: string;
  };
}

export interface CreateDealData {
  leadId: string;
  title: string;
  description?: string;
  value: number;
  currency?: string;
  stage?: Deal["stage"];
  probability?: number;
  source?: string;
  priority?: Deal["priority"];
  expectedCloseDate?: string;
  metadata?: any;
}

export interface DealFilters {
  stage?: string;
  userId?: string;
  organizationId?: string;
  limit?: number;
  offset?: number;
}

export function useDeals(filters: DealFilters = {}) {
  const { currentOrganization } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery({
    queryKey: [
      "deals",
      currentOrganization?.organizationId,
      currentWorkspace?.id || null,
      filters,
    ],
    queryFn: async () => {
      if (!currentOrganization?.organizationId) {
        throw new Error("No organization selected");
      }

      const params = new URLSearchParams();

      if (filters.stage) params.append("stage", filters.stage);
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.organizationId)
        params.append("organizationId", filters.organizationId);
      else params.append("organizationId", currentOrganization.organizationId);
      if (currentWorkspace?.id)
        params.append("workspaceId", currentWorkspace.id);
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.offset) params.append("offset", filters.offset.toString());

      const response = await apiClient.get(`/deals?${params.toString()}`);
      const result = (response as any).data;

     
      const workspaceId = currentWorkspace?.id;
      if (workspaceId && result && Array.isArray(result.deals)) {
        return {
          ...result,
          deals: result.deals.filter(
            (deal: any) => deal?.metadata?.workspaceId === workspaceId
          ),
        };
      }

      return result;
    },
    enabled: !!currentOrganization?.organizationId,
  });
}

export function useDeal(dealId: string) {
  return useQuery({
    queryKey: ["deal", dealId],
    queryFn: async () => {
      const response = await apiClient.get(`/deals/${dealId}`);
      return (response as any).data;
    },
    enabled: !!dealId,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  const { user, currentOrganization } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();

  return useMutation({
    mutationFn: async (data: CreateDealData) => {
      if (!currentOrganization?.organizationId || !user?.userId) {
        throw new Error("Missing organization or user context");
      }

      const payload = {
        ...data,
        userId: user.userId,
        organizationId: currentOrganization.organizationId,
       
        metadata:
          currentWorkspace?.id || data.metadata
            ? { ...(data.metadata || {}), workspaceId: currentWorkspace?.id }
            : undefined,
      };

      const response = await apiClient.post("/deals", payload);
      return (response as any).data;
    },
    onSuccess: () => {
     
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      dealId,
      data,
    }: {
      dealId: string;
      data: Partial<CreateDealData>;
    }) => {
      const response = await apiClient.put(`/deals/${dealId}`, data);
      return (response as any).data;
    },
    onSuccess: (data, variables) => {
     
      queryClient.invalidateQueries({ queryKey: ["deal", variables.dealId] });

     
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId: string) => {
      const response = await apiClient.delete(`/deals/${dealId}`);
      return (response as any).data;
    },
    onSuccess: (data, dealId) => {
     
      queryClient.removeQueries({ queryKey: ["deal", dealId] });

     
      queryClient.invalidateQueries({ queryKey: ["deals"] });
    },
  });
}

export function useDealsByStage() {
  const { currentOrganization } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery({
    queryKey: [
      "deals",
      "by-stage",
      currentOrganization?.organizationId,
      currentWorkspace?.id || null,
    ],
    queryFn: async () => {
      if (!currentOrganization?.organizationId) {
        throw new Error("No organization selected");
      }

      const params = new URLSearchParams();
      params.append("organizationId", currentOrganization.organizationId);
      params.append("limit", "1000");
      if (currentWorkspace?.id)
        params.append("workspaceId", currentWorkspace.id);

      const response = await apiClient.get(`/deals?${params.toString()}`);
      const deals = (response as any).data.deals || [];

     
      const dealsByStage: Record<string, Deal[]> = {
        qualification: [],
        proposal: [],
        negotiation: [],
        decision: [],
        closed_won: [],
        closed_lost: [],
      };

     
      deals.forEach((deal: Deal) => {
        if (dealsByStage[deal.stage]) {
          dealsByStage[deal.stage].push(deal);
        } else {
         
          console.warn(
            `Unknown deal stage: "${deal.stage}" for deal ${deal.dealId}. Available stages:`,
            Object.keys(dealsByStage)
          );
        }
      });

      console.log(
        "Deals grouped by stage:",
        Object.entries(dealsByStage).map(([stage, deals]) => ({
          stage,
          count: deals.length,
        }))
      );

      return dealsByStage;
    },
    enabled: !!currentOrganization?.organizationId,
  });
}

export function useDealStats() {
  const { currentOrganization } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery({
    queryKey: [
      "deals",
      "stats",
      currentOrganization?.organizationId,
      currentWorkspace?.id || null,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentOrganization?.organizationId) {
        params.append("organizationId", currentOrganization.organizationId);
      }
      params.append("limit", "1000");
      if (currentWorkspace?.id)
        params.append("workspaceId", currentWorkspace.id);

      const response = await apiClient.get(`/deals?${params.toString()}`);
      const deals = response.data?.deals || [];

      const stats = {
        total: deals.length,
        totalValue: deals.reduce(
          (sum: number, deal: Deal) => sum + parseFloat(deal.value.toString()),
          0
        ),
        avgValue:
          deals.length > 0
            ? deals.reduce(
                (sum: number, deal: Deal) =>
                  sum + parseFloat(deal.value.toString()),
                0
              ) / deals.length
            : 0,
        wonDeals: deals.filter((deal: Deal) => deal.stage === "closed_won")
          .length,
        lostDeals: deals.filter((deal: Deal) => deal.stage === "closed_lost")
          .length,
        winRate:
          deals.length > 0
            ? (deals.filter((deal: Deal) => deal.stage === "closed_won")
                .length /
                deals.length) *
              100
            : 0,
        byStage: deals.reduce((acc: Record<string, number>, deal: Deal) => {
          acc[deal.stage] = (acc[deal.stage] || 0) + 1;
          return acc;
        }, {}),
        valueByStage: deals.reduce(
          (acc: Record<string, number>, deal: Deal) => {
            acc[deal.stage] =
              (acc[deal.stage] || 0) + parseFloat(deal.value.toString());
            return acc;
          },
          {}
        ),
        weightedForecast: deals
          .filter((deal: Deal) => !String(deal.stage).includes("closed"))
          .reduce(
            (sum: number, deal: Deal) =>
              sum + Number(deal.value) * (Number(deal.probability || 0) / 100),
            0
          ),
      };

      return stats;
    },
    enabled: !!currentOrganization?.organizationId,
  });
}
