import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface Contact {
  id: string;
  workspace_id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  alt_email?: string;
  phone_number?: string;
  mobile_number?: string;
  alt_phone?: string;
  job_title?: string;
  department?: string;
  location?: string;
  timezone?: string;
  language?: string;
  preferred_contact_method?: string;
  do_not_call?: boolean;
  do_not_email?: boolean;
  linkedin_url?: string;
  twitter_handle?: string;
  status_id: string;
  owner_id?: string;
  created_by?: string;
  updated_by?: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  status?: {
    id: string;
    status_name: string;
    color: string;
  };
  account?: {
    id: string;
    account_name: string;
  };
  owner?: {
    id: string;
    name: string;
    email: string;
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

const getContactsService = asyncHandlerClient(
  async (params: {
    workspaceId: string;
    accountId?: string;
    page?: number;
    limit?: number;
    searchTerm?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc' | null;
  }) => {
    const {
      workspaceId,
      accountId,
      page = 1,
      limit = 20,
      searchTerm = '',
      sortColumn = '',
      sortDirection = '',
    } = params;
    let url = `/contacts?workspaceId=${workspaceId}&page=${page}&limit=${limit}&searchTerm=${searchTerm}&sortColumn=${sortColumn}&sortDirection=${sortDirection || ''}`;
    if (accountId) {
      url += `&accountId=${accountId}`;
    }
    const response = await ApiClient.get(url);
    return {
      data: (response.data?.data || []) as Contact[],
      count: (response.data?.count || 0) as number,
    };
  },
);

const getContactByIdService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.get(`/contacts/${id}`);
  return response.data?.data || null;
});

const createContactService = asyncHandlerClient(
  async (payload: Partial<Record<string, any>>) => {
    const response = await ApiClient.post('/contacts', payload);
    return response.data?.data;
  },
);

const updateContactService = asyncHandlerClient(
  async (id: string, payload: Partial<Record<string, any>>) => {
    const response = await ApiClient.patch(`/contacts/${id}`, payload);
    return response.data?.data;
  },
);

const deleteContactService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(`/contacts/${id}`);
  return response.data?.data;
});

export {
  getContactsService,
  getContactByIdService,
  createContactService,

  updateContactService,
  deleteContactService,
};
