import { FundRaiseApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';

const getDealsService = asyncHandlerClient(async (workspaceId: string) => {
  const res = await FundRaiseApiClient.get(`/deals?workspaceId=${workspaceId}`);
  return res?.data?.data ?? [];
});

const createDealService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.post('/deals', payload);
  return res?.data?.data;
});

const updateDealService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.patch('/deals', payload);
  return res?.data?.data;
});

const deleteDealService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await FundRaiseApiClient.delete(`/deals?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

export { getDealsService, createDealService, updateDealService, deleteDealService };
