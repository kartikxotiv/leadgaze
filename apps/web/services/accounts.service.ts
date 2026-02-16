import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface Account {
  id: string;
  workspace_id: string;
  account_name: string;
  website?: string;
  phone_number?: string;
  industry_id?: string;
  company_size?: string;
  billing_street?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  description?: string;
  is_public?: boolean;
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

const getAccountsService = asyncHandlerClient(
  async (params: {
    workspaceId: string;
    page?: number;
    limit?: number;
    searchTerm?: string;
  }) => {
    const { workspaceId, page = 1, limit = 20, searchTerm = '' } = params;
    const response = await ApiClient.get(
      `/accounts?workspaceId=${workspaceId}&page=${page}&limit=${limit}&searchTerm=${searchTerm}`,
    );
    return {
      data: (response.data?.data || []) as Account[],
      count: (response.data?.count || 0) as number,
    };
  },
);

const getAccountByIdService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.get(`/accounts/${id}`);
  return response.data?.data || null;
});

const createAccountService = asyncHandlerClient(
  async (payload: Partial<Record<string, any>>) => {
    const response = await ApiClient.post('/accounts', payload);
    return response.data?.data;
  },
);

const updateAccountService = asyncHandlerClient(
  async (id: string, payload: Partial<Record<string, any>>) => {
    const response = await ApiClient.patch(`/accounts/${id}`, payload);
    return response.data?.data;
  },
);

const deleteAccountService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(`/accounts/${id}`);
  return response.data?.data;
});

export {
  getAccountsService,
  getAccountByIdService,
  createAccountService,
  updateAccountService,
  deleteAccountService,
};
