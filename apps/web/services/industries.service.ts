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

const createIndustryService = asyncHandlerClient(
  async (workspaceId: string, industryName: string) => {
    const response = await ApiClient.post('/industries', {
      workspace_id: workspaceId,
      industry_name: industryName,
    });
    return response.data?.data;
  },
);

export { getIndustriesService, createIndustryService };
