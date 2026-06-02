import { CoreApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';
import { entityQuery } from './_entity-query';

export const getDocumentsService = asyncHandlerClient(async (workspaceId: string, entityType?: string, entityId?: string) => {
  const res = await CoreApiClient.get(`/documents?${entityQuery(workspaceId, entityType, entityId)}`);
  return res?.data?.data ?? [];
});

export const uploadDocumentService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.post('/documents', payload);
  return res?.data?.data;
});

export const updateDocumentService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await CoreApiClient.patch('/documents', payload);
  return res?.data?.data;
});

export const deleteDocumentService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await CoreApiClient.delete(`/documents?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

