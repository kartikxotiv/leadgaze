import { asyncHandlerClient } from '../utils/async-handler';
import InventoryApiClient from '../utils/axios-client';

export type TransfersQuery = {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

export type TransfersPayload = Record<string, unknown>;

function buildQueryString(params: TransfersQuery) {
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

export const getTransfersService = asyncHandlerClient(
  async (params: TransfersQuery) => {
    const response = await InventoryApiClient.get(`/transfers?${buildQueryString(params)}`);
    return response.data?.data ?? [];
  },
);

export const createTransferService = asyncHandlerClient(
  async (payload: TransfersPayload) => {
    const response = await InventoryApiClient.post('/transfers', payload);
    return response.data?.data ?? null;
  },
);
