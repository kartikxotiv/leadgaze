import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface Industry {
  id: string;
  industry_name: string;
}

const getIndustriesService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await ApiClient.get(
    `/industries?workspaceId=${workspaceId}`,
  );
  return response.data?.data || [];
});

export { getIndustriesService };
