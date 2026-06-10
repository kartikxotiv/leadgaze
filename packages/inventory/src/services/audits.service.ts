import { asyncHandlerClient } from '../utils/async-handler';
import InventoryApiClient from '../utils/axios-client';

export type AuditsQuery = {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

export type AuditsPayload = Record<string, unknown>;

function buildQueryString(params: AuditsQuery) {
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

export const getAuditsService = asyncHandlerClient(
  async (params: AuditsQuery) => {
    const response = await InventoryApiClient.get(`/audits?${buildQueryString(params)}`);
    return response.data?.data ?? [];
  },
);

export const createAuditService = asyncHandlerClient(
  async (payload: AuditsPayload) => {
    const response = await InventoryApiClient.post('/audits', payload);
    return response.data?.data ?? null;
  },
);
