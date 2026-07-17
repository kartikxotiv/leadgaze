import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export const getZapierSettingsService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(`/workspaces/${workspaceId}/zapier`);
    return response.data?.data;
  }
);

export const toggleZapierStatusService = asyncHandlerClient(
  async (workspaceId: string, checked: boolean) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/zapier`, {
      action: 'toggle-status',
      checked,
    });
    return response.data?.data;
  }
);

export const generateZapierKeyService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/zapier`, {
      action: 'generate-key',
    });
    return response.data?.data;
  }
);

export const revokeZapierKeyService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/zapier`, {
      action: 'revoke-key',
    });
    return response.data?.data;
  }
);
