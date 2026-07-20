import { CoreApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';
import { entityQuery } from './_entity-query';

export const getDocumentsService = asyncHandlerClient(async (workspaceId: string, entityType?: string, entityId?: string, params?: { createdAtFrom?: string; createdAtTo?: string; updatedAtFrom?: string; updatedAtTo?: string }) => {
  let url = `/documents?${entityQuery(workspaceId, entityType, entityId)}`;
  if (params?.createdAtFrom) {
    url += `&createdAtFrom=${params.createdAtFrom}`;
  }
  if (params?.createdAtTo) {
    url += `&createdAtTo=${params.createdAtTo}`;
  }
  if (params?.updatedAtFrom) {
    url += `&updatedAtFrom=${params.updatedAtFrom}`;
  }
  if (params?.updatedAtTo) {
    url += `&updatedAtTo=${params.updatedAtTo}`;
  }
  const res = await CoreApiClient.get(url);
  return res?.data?.data ?? [];
});

export const uploadDocumentService = asyncHandlerClient(async (payload: FormData | Record<string, unknown>) => {
  const res = await CoreApiClient.post('/documents', payload);
  return res?.data?.data;
});

export const updateDocumentService = asyncHandlerClient(async (payload: FormData | Record<string, unknown>) => {
  const res = await CoreApiClient.patch('/documents', payload);
  return res?.data?.data;
});

export const deleteDocumentService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await CoreApiClient.delete(`/documents?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});
