import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export const getGoogleAdsSettingsService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(`/workspaces/${workspaceId}/google-ads`);
    return response.data?.data;
  },
);

export const getGoogleAdsAuthUrlService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/google-ads`, {
      action: 'get-auth-url',
    });
    return response.data?.data as { url: string };
  },
);

export const disconnectGoogleAdsService = asyncHandlerClient(
  async (workspaceId: string, accountId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/google-ads`, {
      action: 'disconnect',
      accountId,
    });
    return response.data?.data;
  },
);

export const saveGoogleAdsFormsService = asyncHandlerClient(
  async (workspaceId: string, forms: unknown[]) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/google-ads`, {
      action: 'save-forms',
      forms,
    });
    return response.data?.data;
  },
);

export const fetchGoogleAdsAccountsService = asyncHandlerClient(
  async (workspaceId: string, accountId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/google-ads`, {
      action: 'fetch-accounts',
      accountId,
    });
    return response.data?.data as { accounts: unknown[] };
  },
);
