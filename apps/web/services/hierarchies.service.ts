import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

const getHierarchiesService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await ApiClient.get(`/hierarchies?workspaceId=${workspaceId}`);
  return response.data?.data || [];
});

const createHierarchyService = asyncHandlerClient(
  async (payload: { workspace_id: string; name: string; level: number }) => {
    const response = await ApiClient.post('/hierarchies', payload);
    return response.data?.data || response.data;
  },
);

export { getHierarchiesService, createHierarchyService };
