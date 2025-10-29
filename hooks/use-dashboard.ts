"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthReady } from "@/hooks/use-auth-ready";

type StageId =
  | "qualification"
  | "proposal"
  | "negotiation"
  | "decision"
  | "closed_won"
  | "closed_lost";

interface Deal {
  dealId: string;
  stage: StageId;
  value: number | string;
}

interface LeadsResponse {
  success: boolean;
  data: {
    leads: any[];
    pagination: { total: number };
  };
}

interface DealsResponse {
  success: boolean;
  data: {
    deals: Deal[];
  };
}

interface ActivitiesResponse {
  success: boolean;
  data: any[];
}

export function useDashboardStats(dateRange?: string) {
  const { currentOrganization } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();
  const orgId = currentOrganization?.organizationId;

  return useQuery({
    queryKey: ["dashboard", "stats", orgId, dateRange],
    enabled: isReady && isAuthenticated && !!orgId,
    queryFn: async () => {
      if (!orgId) throw new Error("No organization selected");

     
      let dateFrom = "";
      let dateTo = "";

      if (dateRange) {
        const now = new Date();
        const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
        const fromDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        dateFrom = fromDate.toISOString();
        dateTo = now.toISOString();
      }

     
      const params = new URLSearchParams({
        organizationId: orgId,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const response = await fetch(`/api/analytics/dashboard?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to fetch dashboard stats");
      }

      return {
        ...data.data.stats,
        trendData: data.data.trendData,
      };
    },
    staleTime: 3 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useRecentActivities(limit = 8) {
  const { currentOrganization } = useAuthStore();
  const { isReady, isAuthenticated } = useAuthReady();
  const orgId = currentOrganization?.organizationId;

  return useQuery({
    queryKey: ["dashboard", "recent-activities", orgId, limit],
    enabled: isReady && isAuthenticated && !!orgId,
    queryFn: async () => {
      if (!orgId) throw new Error("No organization selected");
      const res = await fetch(
        `/api/activities?organizationId=${orgId}&limit=${limit}`
      );
      const json: ActivitiesResponse = await res.json();
      return json?.data || [];
    },
    staleTime: 60_000,
  });
}
