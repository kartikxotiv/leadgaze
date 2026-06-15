import { FundRaiseApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';

const getCommitmentsService = asyncHandlerClient(async (workspaceId: string) => {
  const res = await FundRaiseApiClient.get(`/commitments?workspaceId=${workspaceId}`);
  return res?.data?.data ?? [];
});

const createCommitmentService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.post('/commitments', payload);
  return res?.data?.data;
});

const updateCommitmentService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.patch('/commitments', payload);
  return res?.data?.data;
});

const deleteCommitmentService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await FundRaiseApiClient.delete(`/commitments?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

export { getCommitmentsService, createCommitmentService, updateCommitmentService, deleteCommitmentService };
