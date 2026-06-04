import { asyncHandlerClient } from '../utils/async-handler';
import InventoryApiClient from '../utils/axios-client';

export type CustomersQuery = {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

export type CustomersPayload = Record<string, unknown>;

function buildQueryString(params: CustomersQuery) {
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

export const getCustomersService = asyncHandlerClient(
  async (params: CustomersQuery) => {
    const response = await InventoryApiClient.get(`/customers?${buildQueryString(params)}`);
    return response.data?.data ?? [];
  },
);

export const createCustomerService = asyncHandlerClient(
  async (payload: CustomersPayload) => {
    const response = await InventoryApiClient.post('/customers', payload);
    return response.data?.data ?? null;
  },
);
