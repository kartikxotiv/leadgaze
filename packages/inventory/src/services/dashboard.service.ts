import { asyncHandlerClient } from '../utils/async-handler';
import InventoryApiClient from '../utils/axios-client';

export type DashboardQuery = {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

export type DashboardPayload = Record<string, unknown>;

function buildQueryString(params: DashboardQuery) {
  const searchParams = new URLSearchParams();
  searchParams.set('workspaceId', params.workspaceId);

  if (params.page) {
    searchParams.set('page', String(params.page));
  }

  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }

  if (params.searchTerm) {
    searchParams.set('searchTerm', params.searchTerm);
  }

  return searchParams.toString();
}

export const getDashboardService = asyncHandlerClient(
  async (params: DashboardQuery) => {
    const response = await InventoryApiClient.get(`/dashboard?${buildQueryString(params)}`);
    return response.data?.data ?? [];
  },
);

export const createDashboardService = asyncHandlerClient(
  async (payload: DashboardPayload) => {
    const response = await InventoryApiClient.post('/dashboard', payload);
    return response.data?.data ?? null;
  },
);
