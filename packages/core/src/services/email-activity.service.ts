import { asyncHandlerClient } from '../utils/async-handler';
import CoreApiClient from '../utils/axios-client';

export const getCoreWorkspaceEmailActivityService = asyncHandlerClient(async (
  workspaceId: string,
  limit = 20,
  offset = 0,
  accountEmail?: string,
) => {
  const params = new URLSearchParams({
    workspaceId,
    limit: String(limit),
    offset: String(offset),
  });

  if (accountEmail) {
    params.set('accountEmail', accountEmail);
  }

  const response = await CoreApiClient.get(`/email-activity?${params.toString()}`);
  return response.data?.data ?? { data: [], count: 0 };
});

export const getCoreEntityEmailActivityService = asyncHandlerClient(async (
  workspaceId: string,
  entityType: string,
  entityId: string,
  limit = 20,
  offset = 0,
) => {
  const params = new URLSearchParams({
    workspaceId,
    entityType,
    entityId,
    limit: String(limit),
    offset: String(offset),
  });

  const response = await CoreApiClient.get(`/email-activity?${params.toString()}`);
  return response.data?.data ?? { data: [], count: 0 };
});

export const saveCoreEmailActivityService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const response = await CoreApiClient.post('/email-activity', payload);
  return response.data?.data ?? null;
});

export const deleteCoreEmailActivityService = asyncHandlerClient(async (id: string, workspaceId: string) => {
  const response = await CoreApiClient.delete(`/email-activity?id=${id}&workspaceId=${workspaceId}`);
  return response.data?.data ?? null;
});

export const sendCoreEmailService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const response = await CoreApiClient.post('/email-send', payload);
  return response.data?.data ?? null;
});

export const syncCoreEmailAccountsService = asyncHandlerClient(async (payload: {
  workspaceId: string;
  emailAccountId?: number | string;
}) => {
  const response = await CoreApiClient.post('/email-sync', payload);
  return response.data?.data ?? null;
});
