import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface DashboardTask {
  id: string;
  title: string;
  dueDate: string;
  priority?: string;
  entityType: string;
  entityId: string;
  entityName: string | null;
  type: 'reminder' | 'meeting';
}

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
  pipeline: {
    newLeads: number;
    contacted: number;
    qualified: number;
    proposalSent: number;
    won: number;
  };
  upcomingTasks: DashboardTask[];
}

const getDashboardMetricsService = asyncHandlerClient(
  async (
    workspaceId: string,
    dateFilter?: { from: string | null; to: string | null } | null,
  ) => {
    let url = `/dashboard?workspaceId=${workspaceId}`;
    if (dateFilter?.from) url += `&from=${dateFilter.from}`;
    if (dateFilter?.to) url += `&to=${dateFilter.to}`;

    const response = await ApiClient.get(url);
    return (response.data?.data as DashboardMetrics) || null;
  },
);

export { getDashboardMetricsService };
