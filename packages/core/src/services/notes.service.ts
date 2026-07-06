import { CoreApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';
import { entityQuery } from './_entity-query';

export const getNotesService = asyncHandlerClient(async (workspaceId: string, entityType?: string, entityId?: string, status?: string) => {
  let url = `/notes?${entityQuery(workspaceId, entityType, entityId)}`;
  if (status) {
    url += `&status=${status}`;
  }
  const res = await CoreApiClient.get(url);
  return res?.data?.data ?? [];
});

export const createNoteService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.post('/notes', payload);
  return res?.data?.data;
});

export const updateNoteService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.patch('/notes', payload);
  return res?.data?.data;
});

export const deleteNoteService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await CoreApiClient.delete(`/notes?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

