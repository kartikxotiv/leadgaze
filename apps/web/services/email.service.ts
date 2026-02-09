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
export {
  getWorkspaceEmailAccountService,
  deleteEmailAccountService,
  submitEmailAccountService
};
