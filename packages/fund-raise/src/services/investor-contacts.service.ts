import { FundRaiseApiClient } from '../utils';
import { asyncHandlerClient } from '../utils/async-handler';

const getInvestorContactsService = asyncHandlerClient(async (workspaceId: string) => {
  const res = await FundRaiseApiClient.get(`/investor-contacts?workspaceId=${workspaceId}`);
  return res?.data?.data ?? [];
});

const createInvestorContactService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.post('/investor-contacts', payload);
  return res?.data?.data;
});

const updateInvestorContactService = asyncHandlerClient(async (payload: Record<string, unknown>) => {
  const res = await FundRaiseApiClient.patch('/investor-contacts', payload);
  return res?.data?.data;
});

const deleteInvestorContactService = asyncHandlerClient(async (workspaceId: string, id: string) => {
  const res = await FundRaiseApiClient.delete(`/investor-contacts?workspaceId=${workspaceId}&id=${id}`);
  return res?.data?.data;
});

export { getInvestorContactsService, createInvestorContactService, updateInvestorContactService, deleteInvestorContactService };
