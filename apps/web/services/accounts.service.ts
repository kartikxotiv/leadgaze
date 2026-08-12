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
  annual_revenue?: number;
  employee_count?: number;
  account_type?: string;
  billing_street?: string;
  billing_city?: string;
  billing_state?: string;
  billing_postal_code?: string;
  billing_country?: string;
  shipping_street?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_postal_code?: string;
  shipping_country?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  status_id: string;
  owner_id?: string | null;
  created_by?: string;
  updated_by?: string;
  created_from_lead_id?: string | null;
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
  created_by_account?: {
    id: string;
    email: string;
    name: string;
  };
  updated_by_account?: {
    id: string;
    email: string;
    name: string;
  };
}

const getAccountsService = asyncHandlerClient(
  async (params: {
    workspaceId: string;
    page?: number;
    limit?: number;
    searchTerm?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc' | null;
    createdAtFrom?: string;
    createdAtTo?: string;
    updatedAtFrom?: string;
    updatedAtTo?: string;
    createdByIds?: string | string[];
  }) => {
    const { 
      workspaceId, 
      page = 1, 
      limit = 20, 
      searchTerm = '', 
      sortColumn = '', 
      sortDirection = '',
      createdAtFrom = '',
      createdAtTo = '',
      updatedAtFrom = '',
      updatedAtTo = '',
      createdByIds = '',
    } = params;
    let url = `/accounts?workspaceId=${workspaceId}&page=${page}&limit=${limit}&searchTerm=${searchTerm}&sortColumn=${sortColumn}&sortDirection=${sortDirection || ''}`;
    
    if (createdAtFrom) url += `&createdAtFrom=${createdAtFrom}`;
    if (createdAtTo) url += `&createdAtTo=${createdAtTo}`;
    if (updatedAtFrom) url += `&updatedAtFrom=${updatedAtFrom}`;
    if (updatedAtTo) url += `&updatedAtTo=${updatedAtTo}`;
    if (createdByIds) {
      const createdByParam = Array.isArray(createdByIds) ? createdByIds.join(',') : createdByIds;
      url += `&createdByIds=${createdByParam}`;
    }
    
    const response = await ApiClient.get(url);
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

export interface AccountType {
  id: string;
  status_name: string;
  status_key: string;
  color: string;
  icon?: string;
  is_closed?: boolean;
  is_system?: boolean;
}

const getAccountTypesService = asyncHandlerClient(async (params: { workspaceId: string; includeInactive?: boolean }) => {
  const { workspaceId, includeInactive = false } = params;
  const url = `/accounts/types?workspaceId=${workspaceId}${includeInactive ? '&includeInactive=true' : ''}`;
  const response = await ApiClient.get(url);
  return (response.data?.data || []) as AccountType[];
});

const getAffectedAccountsForTypeService = asyncHandlerClient(
  async (params: { typeId: string; workspaceId: string; limit?: number; offset?: number }) => {
    const { typeId, workspaceId, limit = 10, offset = 0 } = params;
    const response = await ApiClient.get(
      `/accounts/types/${typeId}/affected?workspaceId=${workspaceId}&limit=${limit}&offset=${offset}`,
    );
    return response.data?.data as { total_count: number; records: { id: string; name: string }[] };
  },
);

const reassignAccountTypeService = asyncHandlerClient(
  async (params: { typeId: string; new_status_id: string; workspace_id: string }) => {
    const { typeId, new_status_id, workspace_id } = params;
    const response = await ApiClient.patch(`/accounts/types/${typeId}/reassign`, {
      new_status_id,
      workspace_id,
    });
    return response.data?.data as { reassigned_count: number; disabled_status_id: string };
  },
);

const createAccountTypeService = asyncHandlerClient(
  async (payload: Partial<Record<string, any>>) => {
    const response = await ApiClient.post('/accounts/types', payload);
    return response.data?.data as AccountType;
  },
);

const updateAccountTypeService = asyncHandlerClient(
  async (id: string, payload: Partial<Record<string, any>>) => {
    const response = await ApiClient.patch(`/accounts/types/${id}`, payload);
    return response.data?.data as AccountType;
  },
);

const deleteAccountTypeService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(`/accounts/types/${id}`);
  return response.data?.data;
});

const reorderAccountTypesService = asyncHandlerClient(
  async (payload: { workspaceId: string; orderedStatusIds: string[] }) => {
    const response = await ApiClient.put('/accounts/types/reorder', payload);
    return response.data?.data;
  },
);

const importAccountsService = asyncHandlerClient(
  async (payload: { workspaceId: string; data: any[] }) => {
    const response = await ApiClient.post('/accounts/import', payload);
    return response.data;
  },
);

export {
  getAccountsService,
  getAccountByIdService,
  createAccountService,
  updateAccountService,
  deleteAccountService,
  getAccountTypesService,
  getAffectedAccountsForTypeService,
  reassignAccountTypeService,
  createAccountTypeService,
  updateAccountTypeService,
  deleteAccountTypeService,
  reorderAccountTypesService,
  importAccountsService,
};
