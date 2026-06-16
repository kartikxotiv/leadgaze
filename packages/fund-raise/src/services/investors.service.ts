import { FundRaiseApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';

const getInvestorsService = asyncHandlerClient(async (workspaceId: string) => {
  const res = await FundRaiseApiClient.get(`/investors?workspaceId=${workspaceId}`);
  return res?.data?.data ?? [];
});

const createInvestorService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.post('/investors', payload);
  return res?.data?.data;
});

const updateInvestorService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.patch('/investors', payload);
  return res?.data?.data;
});

const deleteInvestorService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await FundRaiseApiClient.delete(`/investors?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

export { getInvestorsService, createInvestorService, updateInvestorService, deleteInvestorService };
