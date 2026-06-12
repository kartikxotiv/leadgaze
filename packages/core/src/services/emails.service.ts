import { CoreApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';
import { entityQuery } from './_entity-query';

export const getEmailsService = asyncHandlerClient(async (workspaceId: string, entityType?: string, entityId?: string) => {
  const res = await CoreApiClient.get(`/emails?${entityQuery(workspaceId, entityType, entityId)}`);
  return res?.data?.data ?? [];
});

export const getEmailThreadService = asyncHandlerClient(async (workspaceId: string, threadId: string) => {
  const res = await CoreApiClient.get(`/emails?workspaceId=${workspaceId}&threadId=${threadId}`);
  return res?.data?.data ?? [];
});

export const sendEmailService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.post('/emails', payload);
  return res?.data?.data;
});

export const updateEmailService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.patch('/emails', payload);
  return res?.data?.data;
});

export const deleteEmailService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await CoreApiClient.delete(`/emails?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

