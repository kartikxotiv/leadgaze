import { asyncHandlerClient } from '../utils/async-handler';
import InventoryApiClient from '../utils/axios-client';

export type ProductsQuery = {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

export type ProductsPayload = Record<string, unknown>;

function buildQueryString(params: ProductsQuery) {
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

export const getProductsService = asyncHandlerClient(
  async (params: ProductsQuery) => {
    const response = await InventoryApiClient.get(`/products?${buildQueryString(params)}`);
    return response.data?.data ?? [];
  },
);

export const createProductService = asyncHandlerClient(
  async (payload: ProductsPayload) => {
    const response = await InventoryApiClient.post('/products', payload);
    return response.data?.data ?? null;
  },
);
