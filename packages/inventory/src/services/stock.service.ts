import { asyncHandlerClient } from '../utils/async-handler';
import InventoryApiClient from '../utils/axios-client';

export type StockQuery = {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

export type StockPayload = Record<string, unknown>;

function buildQueryString(params: StockQuery) {
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

export const getStockService = asyncHandlerClient(
  async (params: StockQuery) => {
    const response = await InventoryApiClient.get(`/stock?${buildQueryString(params)}`);
    return response.data?.data ?? [];
  },
);

export const createStockService = asyncHandlerClient(
  async (payload: StockPayload) => {
    const response = await InventoryApiClient.post('/stock', payload);
    return response.data?.data ?? null;
  },
);
