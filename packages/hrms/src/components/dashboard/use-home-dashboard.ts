'use client';

import { useQuery } from '@tanstack/react-query';

import { getHomeDashboardStatsService } from '../../server/services/home-dashboard.service';
import type { HomeDashboardData } from '../../types/home-dashboard.type';

export function useHomeDashboard() {
  const dashboardQuery = useQuery({
    queryKey: ['home-dashboard'],
    queryFn: () => getHomeDashboardStatsService(),
  });

  const data = dashboardQuery.data?.data as HomeDashboardData | undefined;

  return {
    data,
    isLoading: dashboardQuery.isLoading,
    isError: dashboardQuery.isError,
    error: dashboardQuery.error,
    refetch: dashboardQuery.refetch,
  };
}
