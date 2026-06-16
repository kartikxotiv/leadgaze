import { CoreApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';
import { entityQuery } from './_entity-query';

export const getRemindersService = asyncHandlerClient(async (workspaceId: string, entityType?: string, entityId?: string) => {
  const res = await CoreApiClient.get(`/reminders?${entityQuery(workspaceId, entityType, entityId)}`);
  return res?.data?.data ?? [];
});

export const createReminderService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.post('/reminders', payload);
  return res?.data?.data;
});

export const updateReminderService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.patch('/reminders', payload);
  return res?.data?.data;
});

export const completeReminderService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await CoreApiClient.patch('/reminders', {
    workspace_id: workspaceId,
    id,
    status: 'completed',
    completed_at: new Date().toISOString(),
  });
  return res?.data?.data;
});

export const deleteReminderService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await CoreApiClient.delete(`/reminders?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

