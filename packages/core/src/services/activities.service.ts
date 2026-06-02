import { CoreApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';
import { entityQuery } from './_entity-query';

export const getActivitiesService = asyncHandlerClient(async (workspaceId: string, entityType?: string, entityId?: string) => {
  const res = await CoreApiClient.get(`/activities?${entityQuery(workspaceId, entityType, entityId)}`);
  return res?.data?.data ?? [];
});

export const logActivityService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.post('/activities', payload);
  return res?.data?.data;
});

export const updateActivityService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.patch('/activities', payload);
  return res?.data?.data;
});

export const deleteActivityService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await CoreApiClient.delete(`/activities?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

