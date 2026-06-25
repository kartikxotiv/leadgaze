import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface WorkspacePreferences {
  id: string;
  workspace_id: string;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  default_currency: string;
  enabledCurrencies: string[];
  created_at: string;
  updated_at: string;
}

export interface UpdatePreferencesPayload {
  workspace_id: string;
  timezone?: string;
  date_format?: string;
  time_format?: '12h' | '24h';
  default_currency?: string;
}

const getWorkspacePreferencesService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(
      `/workspaces/preferences?workspaceId=${workspaceId}`,
    );
    return (response.data?.data || null) as WorkspacePreferences | null;
  },
);

const updateWorkspacePreferencesService = asyncHandlerClient(
  async (payload: UpdatePreferencesPayload) => {
    const response = await ApiClient.put('/workspaces/preferences', payload);
    return (response.data?.data || null) as WorkspacePreferences | null;
  },
);

export {
  getWorkspacePreferencesService,
  updateWorkspacePreferencesService,
};
