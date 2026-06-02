import { FundRaiseApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';

const getRoundsService = asyncHandlerClient(async (workspaceId: string) => {
    const res = await FundRaiseApiClient.get(`/rounds?workspaceId=${workspaceId}`)
    // API envelope: { success, message, data: Round[] }
    return res?.data?.data ?? [];
})

const createRoundService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.post('/rounds', payload);
  return res?.data?.data;
});

const updateRoundService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.patch('/rounds', payload);
  return res?.data?.data;
});

const deleteRoundService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await FundRaiseApiClient.delete(`/rounds?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

export {
  getRoundsService,
  createRoundService,
  updateRoundService,
  deleteRoundService,
};
