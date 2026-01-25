import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface Account {
  id: string;
  workspace_id: string;
  account_name: string;
  website?: string;
  phone_number?: string;
  industry_id?: string;
  status_id: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
  // Relations
  status?: {
    id: string;
    status_name: string;
    color: string;
  };
  owner?: {
    id: string;
    name: string;
    email: string;
  };
  industry?: {
    id: string;
    industry_name: string;
  };
}

const getAccountsService = asyncHandlerClient(async (workspaceId: string) => {
  const response = await ApiClient.get(`/accounts?workspaceId=${workspaceId}`);
  return response.data?.data || [];
});

export { getAccountsService };
