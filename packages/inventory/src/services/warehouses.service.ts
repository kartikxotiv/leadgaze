import { asyncHandlerClient } from '../utils/async-handler';
import InventoryApiClient from '../utils/axios-client';

export type WarehousesQuery = {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

export type WarehousesPayload = Record<string, unknown>;

function buildQueryString(params: WarehousesQuery) {
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

export const getWarehousesService = asyncHandlerClient(
  async (params: WarehousesQuery) => {
    const response = await InventoryApiClient.get(`/warehouses?${buildQueryString(params)}`);
    return response.data?.data ?? [];
  },
);

export const createWarehouseService = asyncHandlerClient(
  async (payload: WarehousesPayload) => {
    const response = await InventoryApiClient.post('/warehouses', payload);
    return response.data?.data ?? null;
  },
);
