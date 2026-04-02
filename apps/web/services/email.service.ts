import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

const getWorkspaceEmailAccountService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await ApiClient.get(
    `/email?workspace_id=${workspaceId}`,
  );
  return response.data || [];
});

const deleteEmailAccountService = asyncHandlerClient(async (id: string, workspaceId: string) => {
  const response = await ApiClient.delete(
    `/email?id=${id}&workspace_id=${workspaceId}`,
  );
  return response.data;
});

const submitEmailAccountService = asyncHandlerClient(async (workspaceId: string, payload: any) => {
  const response = await ApiClient.post(
    `/email/smtp?workspace_id=${workspaceId}`,
    payload
  );
  return response.data;
});

const getEntityEmailActivityService = asyncHandlerClient(async (entityId: string, entityType: string) => {
  const response = await ApiClient.get(
    `/email/activity?entityId=${entityId}&entityType=${entityType}`,
  );
  return response.data?.data || [];
});

const saveEmailActivityService = asyncHandlerClient(async (payload: any) => {
  const response = await ApiClient.post(
    `/email/activity`,
    payload
  );
  return response.data?.data || null;
});

const deleteEmailActivityService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(
    `/email/activity?id=${id}`,
  );
  return response.data;
});

export {
  getWorkspaceEmailAccountService,
  deleteEmailAccountService,
  submitEmailAccountService,
  getEntityEmailActivityService,
  saveEmailActivityService,
  deleteEmailActivityService
};
