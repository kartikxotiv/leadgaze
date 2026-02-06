import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

const getWorkspaceEmailAccountService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await ApiClient.get(
    `/email?workspace_id=${workspaceId}`,
  );
  console.log(response.data, 'hello');
  return response.data || [];
});

export {
  getWorkspaceEmailAccountService,
};
