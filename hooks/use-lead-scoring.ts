import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";

export interface LeadScore {
  scoreId: string;
  leadId: string;
  totalScore: number;
  tier: "cold" | "warm" | "hot" | "burning";
  lastCalculated: string;
  scoreBreakdown: ScoreBreakdown[];
  userId: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  lead?: {
    leadId: string;
    firstName: string;
    lastName: string;
    businessName: string;
    email: string;
    phone: string;
    jobTitle: string;
    source: string;
  };
}

export interface ScoreBreakdown {
  ruleId: string;
  ruleName: string;
  points: number;
  reason: string;
}

export interface ScoringRule {
  ruleId: string;
  ruleName: string;
  ruleType: string;
  condition: any;
  points: number;
  isActive: boolean;
  priority: number;
  description?: string;
  organizationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalculateScoreData {
  leadId?: string;
  leadIds?: string[];
  organizationId: string;
}

export interface CreateRuleData {
  ruleName: string;
  ruleType: string;
  condition: any;
  points: number;
  description?: string;
  priority?: number;
  isActive?: boolean;
}

export function useLeadScores(
  filters: {
    organizationId?: string;
    tier?: string;
    minScore?: number;
    maxScore?: number;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { organizationId } = useAuthStore();

  return useQuery({
    queryKey: ["lead-scores", filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters.organizationId)
        params.append("organizationId", filters.organizationId);
      else if (organizationId) params.append("organizationId", organizationId);
      if (filters.tier) params.append("tier", filters.tier);
      if (filters.minScore)
        params.append("minScore", filters.minScore.toString());
      if (filters.maxScore)
        params.append("maxScore", filters.maxScore.toString());
      if (filters.limit) params.append("limit", filters.limit.toString());
      if (filters.offset) params.append("offset", filters.offset.toString());

      const response = await apiClient.get(
        `/api/leads/scoring?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!(filters.organizationId || organizationId),
  });
}

export function useCalculateLeadScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CalculateScoreData) => {
      const response = await apiClient.post("/leads/scoring", data);
      return response.data;
    },
    onSuccess: () => {
     
      queryClient.invalidateQueries({ queryKey: ["lead-scores"] });

     
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function useScoringRules(organizationId?: string, isActive?: boolean) {
  const { organizationId: authOrgId } = useAuthStore();
  const orgId = organizationId || authOrgId;

  return useQuery({
    queryKey: ["scoring-rules", orgId, isActive],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) params.append("organizationId", orgId);
      if (isActive !== undefined)
        params.append("isActive", isActive.toString());

      const response = await apiClient.get(
        `/api/leads/scoring/rules?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!orgId,
  });
}

export function useCreateScoringRule() {
  const queryClient = useQueryClient();
  const { user, organizationId } = useAuthStore();

  return useMutation({
    mutationFn: async (
      data: CreateRuleData | { initializeDefaults: boolean }
    ) => {
      const payload = {
        ...data,
        organizationId,
        createdBy: user?.userId,
      };

      const response = await apiClient.post(
        "/api/leads/scoring/rules",
        payload
      );
      return response.data;
    },
    onSuccess: () => {
     
      queryClient.invalidateQueries({ queryKey: ["scoring-rules"] });
    },
  });
}

export function useScoringStats(organizationId?: string) {
  const { organizationId: authOrgId } = useAuthStore();
  const orgId = organizationId || authOrgId;

  return useQuery({
    queryKey: ["scoring-stats", orgId],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/leads/scoring?organizationId=${orgId}&limit=1000`
      );
      const scores = response.data?.scores || [];

      const stats = {
        total: scores.length,
        byTier: {
          cold: scores.filter((s: LeadScore) => s.tier === "cold").length,
          warm: scores.filter((s: LeadScore) => s.tier === "warm").length,
          hot: scores.filter((s: LeadScore) => s.tier === "hot").length,
          burning: scores.filter((s: LeadScore) => s.tier === "burning").length,
        },
        averageScore:
          scores.length > 0
            ? scores.reduce(
                (sum: number, s: LeadScore) => sum + s.totalScore,
                0
              ) / scores.length
            : 0,
        highScoreLeads: scores.filter((s: LeadScore) => s.totalScore >= 60)
          .length,
        recentlyScored: scores.filter((s: LeadScore) => {
          const scored = new Date(s.lastCalculated);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return scored >= oneDayAgo;
        }).length,
      };

      return stats;
    },
    enabled: !!orgId,
  });
}

export function useBatchCalculateScores() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuthStore();

  return useMutation({
    mutationFn: async (leadIds: string[]) => {
      const response = await apiClient.post("/leads/scoring", {
        leadIds,
        organizationId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-scores"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
  });
}

export function getTierColor(tier: LeadScore["tier"]) {
  switch (tier) {
    case "burning":
      return "bg-red-100 text-red-800 border-red-200";
    case "hot":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "warm":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "cold":
      return "bg-blue-100 text-blue-800 border-blue-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getTierIcon(tier: LeadScore["tier"]) {
  switch (tier) {
    case "burning":
      return "🔥";
    case "hot":
      return "🌶️";
    case "warm":
      return "🟡";
    case "cold":
      return "🧊";
    default:
      return "📊";
  }
}
