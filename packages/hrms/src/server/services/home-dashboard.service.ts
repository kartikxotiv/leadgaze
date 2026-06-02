import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '../utils/axios-client';
import { HomeDashboardData } from '~/types/home-dashboard.type';
import { ApiSuccessResponse } from '~/types/rbac.type';

export const getHomeDashboardStatsService = asyncHandlerClient(async () => {
  const response = await ApiClient.get<ApiSuccessResponse<HomeDashboardData>>(
    '/home/dashboard',
  );

  return response.data;
});
