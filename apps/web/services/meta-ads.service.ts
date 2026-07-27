import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export const getMetaAdsSettingsService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(`/workspaces/${workspaceId}/meta-ads`);
    return response.data?.data;
  },
);

export const getMetaAdsAuthUrlService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/meta-ads`, {
      action: 'get-auth-url',
    });
    return response.data?.data as { url: string };
  },
);

export const disconnectMetaAdsPageService = asyncHandlerClient(
  async (workspaceId: string, pageAccountId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/meta-ads`, {
      action: 'disconnect',
      pageAccountId,
    });
    return response.data?.data;
  },
);

export const saveMetaAdsFormsService = asyncHandlerClient(
  async (workspaceId: string, forms: unknown[]) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/meta-ads`, {
      action: 'save-forms',
      forms,
    });
    return response.data?.data;
  },
);

export const saveMetaAdsFieldMappingsService = asyncHandlerClient(
  async (
    workspaceId: string,
    formId: string,
    mappings: Array<{ meta_field: string; leadgaze_field: string }>,
  ) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/meta-ads`, {
      action: 'save-field-mappings',
      form_id: formId,
      mappings,
    });
    return response.data?.data;
  },
);

export const fetchMetaAdsLeadFormsService = asyncHandlerClient(
  async (workspaceId: string, pageAccountId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/meta-ads`, {
      action: 'fetch-lead-forms',
      pageAccountId,
    });
    return response.data?.data as { forms: unknown[] };
  },
);

export const subscribeMetaAdsPageService = asyncHandlerClient(
  async (workspaceId: string, pageAccountId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/meta-ads`, {
      action: 'subscribe-page',
      pageAccountId,
    });
    return response.data?.data;
  },
);

export const fetchMetaAdsPagesService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.post(`/workspaces/${workspaceId}/meta-ads`, {
      action: 'fetch-pages',
    });
    return response.data?.data as { pages: unknown[] };
  },
);
