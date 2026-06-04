import { asyncHandlerClient } from '../utils/async-handler';
import InventoryApiClient from '../utils/axios-client';

export type SettingsQuery = {
  workspaceId: string;
  page?: number;
  limit?: number;
  searchTerm?: string;
};

export type SettingsPayload = Record<string, unknown>;

function buildQueryString(params: SettingsQuery) {
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

export const getSettingsService = asyncHandlerClient(
  async (params: SettingsQuery) => {
    const response = await InventoryApiClient.get(`/settings?${buildQueryString(params)}`);
    return response.data?.data ?? [];
  },
);

export const createSettingService = asyncHandlerClient(
  async (payload: SettingsPayload) => {
    const response = await InventoryApiClient.post('/settings', payload);
    return response.data?.data ?? null;
  },
);
