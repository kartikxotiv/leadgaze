import { asyncHandlerClient } from '../utils/async-handler';
import InventoryApiClient from '../utils/axios-client';

export type VendorsQuery = {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

export type VendorsPayload = Record<string, unknown>;

function buildQueryString(params: VendorsQuery) {
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

export const getVendorsService = asyncHandlerClient(
  async (params: VendorsQuery) => {
    const response = await InventoryApiClient.get(`/vendors?${buildQueryString(params)}`);
    return response.data?.data ?? [];
  },
);

export const createVendorService = asyncHandlerClient(
  async (payload: VendorsPayload) => {
    const response = await InventoryApiClient.post('/vendors', payload);
    return response.data?.data ?? null;
  },
);
