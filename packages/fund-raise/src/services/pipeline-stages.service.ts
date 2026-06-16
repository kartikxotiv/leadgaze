import { FundRaiseApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';

const getPipelineStagesService = asyncHandlerClient(async (workspaceId: string) => {
  const res = await FundRaiseApiClient.get(`/pipeline-stages?workspaceId=${workspaceId}`);
  return res?.data?.data ?? [];
});

const createPipelineStageService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.post('/pipeline-stages', payload);
  return res?.data?.data;
});

const updatePipelineStageService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.patch('/pipeline-stages', payload);
  return res?.data?.data;
});

const deletePipelineStageService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await FundRaiseApiClient.delete(`/pipeline-stages?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

export { getPipelineStagesService, createPipelineStageService, updatePipelineStageService, deletePipelineStageService };
