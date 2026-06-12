import { CoreApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';
import { entityQuery } from './_entity-query';

export const getMeetingsService = asyncHandlerClient(async (workspaceId: string, entityType?: string, entityId?: string) => {
  const res = await CoreApiClient.get(`/meetings?${entityQuery(workspaceId, entityType, entityId)}`);
  return res?.data?.data ?? [];
});

export const createMeetingService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.post('/meetings', payload);
  return res?.data?.data;
});

export const updateMeetingService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.patch('/meetings', payload);
  return res?.data?.data;
});

export const cancelMeetingService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.patch('/meetings', { ...payload, status: 'cancelled' });
  return res?.data?.data;
});

export const deleteMeetingService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await CoreApiClient.delete(`/meetings?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

