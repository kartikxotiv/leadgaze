import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface DashboardMetrics {
  leads: {
    total: number;
    new: number;
    trend: number;
  };
  contacts: {
    total: number;
  };
  accounts: {
    total: number;
  };
  opportunities: {
    totalAmount: number;
    count: number;
  };
}

const getDashboardMetricsService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(
      `/dashboard?workspaceId=${workspaceId}`,
    );
    return (response.data?.data as DashboardMetrics) || null;
  },
);

export { getDashboardMetricsService };
