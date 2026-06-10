import type { HomeDashboardData } from '../../types/home-dashboard.type';
import type { ApiSuccessResponse } from '../../types/rbac.type';
import { asyncHandlerClient } from '../../utils/async-handler';
import ApiClient from '../../utils/axios-client';

export const getHomeDashboardStatsService = asyncHandlerClient(async () => {
  const response =
    await ApiClient.get<ApiSuccessResponse<HomeDashboardData>>(
      '/home/dashboard',
    );

  return response.data;
});
