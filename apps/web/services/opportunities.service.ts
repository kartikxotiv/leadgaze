import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface Opportunity {
  id: string;
  workspace_id: string;
  opportunity_name: string;
  amount: number;
  currency: string;
  expected_close_date?: string;
  probability: number;
  stage_id: string;
  account_id: string;
  primary_contact_id?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  priority?: 'High' | 'Medium' | 'Low';
  opportunity_type?: 'New Business' | 'Existing Business';
  lead_source?: string;
  description?: string;
  competitor?: string;
  is_closed?: boolean;
  is_won?: boolean;
  close_reason?: string;
  // Relations
  stage?: {
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
}

const getOpportunitiesService = asyncHandlerClient(
  async (params: {
    workspaceId: string;
    accountId?: string;
    page?: number;
    limit?: number;
    searchTerm?: string;
    stageId?: string;
  }) => {
    const {
      workspaceId,
      accountId,
      page = 1,
      limit = 20,
      searchTerm = '',
      stageId = '',
    } = params;
    let url = `/opportunities?workspaceId=${workspaceId}&page=${page}&limit=${limit}&searchTerm=${searchTerm}&stageId=${stageId}`;
    if (accountId) {
      url += `&accountId=${accountId}`;
    }
    const response = await ApiClient.get(url);
    return {
      data: (response.data?.data || []) as Opportunity[],
      count: (response.data?.count || 0) as number,
    };
  },
);

const getOpportunityByIdService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.get(`/opportunities/${id}`);
  return response.data?.data || null;
});

const updateOpportunityService = asyncHandlerClient(
  async (id: string, payload: Partial<Record<string, any>>) => {
    const response = await ApiClient.patch(`/opportunities/${id}`, payload);
    return response.data?.data;
  },
);

const createOpportunityService = asyncHandlerClient(
  async (payload: Partial<Opportunity>) => {
    const response = await ApiClient.post('/opportunities', payload);
    return response.data?.data;
  },
);

const getOpportunityStatusesService = asyncHandlerClient(
  async (workspaceId: string) => {
    const response = await ApiClient.get(
      `/opportunities/statuses?workspaceId=${workspaceId}`,
    );
    return response.data?.data || [];
  },
);

export {
  getOpportunitiesService,
  getOpportunityByIdService,
  updateOpportunityService,
  createOpportunityService,
  getOpportunityStatusesService,
};
