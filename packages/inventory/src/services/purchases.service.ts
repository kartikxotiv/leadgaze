import { asyncHandlerClient } from '../utils/async-handler';
import InventoryApiClient from '../utils/axios-client';

export type PurchasesQuery = {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

export type PurchasesPayload = Record<string, unknown>;

function buildQueryString(params: PurchasesQuery) {
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

export const getPurchasesService = asyncHandlerClient(
  async (params: PurchasesQuery) => {
    const response = await InventoryApiClient.get(`/purchases?${buildQueryString(params)}`);
    return response.data?.data ?? [];
  },
);

export const createPurchaseService = asyncHandlerClient(
  async (payload: PurchasesPayload) => {
    const response = await InventoryApiClient.post('/purchases', payload);
    return response.data?.data ?? null;
  },
);
