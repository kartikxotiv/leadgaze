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
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  priority?: 'High' | 'Medium' | 'Low';
  opportunity_type?: 'New Business' | 'Existing Business';
  lead_source?: string;
  description?: string;
  competitor?: string;
  is_closed?: boolean;
  is_won?: boolean;
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

const getOpportunitiesService = asyncHandlerClient(
  async (params: {
    workspaceId: string;
    accountId?: string;
    page?: number;
    limit?: number;
    searchTerm?: string;
    stageId?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc' | null;
    createdAtFrom?: string;
    createdAtTo?: string;
    updatedAtFrom?: string;
    updatedAtTo?: string;
  }) => {
    const {
      workspaceId,
      accountId,
      page = 1,
      limit = 20,
      searchTerm = '',
      stageId = '',
      sortColumn = '',
      sortDirection = '',
      createdAtFrom = '',
      createdAtTo = '',
      updatedAtFrom = '',
      updatedAtTo = '',
    } = params;
    let url = `/opportunities?workspaceId=${workspaceId}&page=${page}&limit=${limit}&searchTerm=${searchTerm}&stageId=${stageId}&sortColumn=${sortColumn}&sortDirection=${sortDirection || ''}`;
    
    if (createdAtFrom) url += `&createdAtFrom=${createdAtFrom}`;
    if (createdAtTo) url += `&createdAtTo=${createdAtTo}`;
    if (updatedAtFrom) url += `&updatedAtFrom=${updatedAtFrom}`;
    if (updatedAtTo) url += `&updatedAtTo=${updatedAtTo}`;
    if (accountId) {
      url += `&accountId=${accountId}`;
    }
    const response = await ApiClient.get(url);
    return {
      data: (response.data?.data || []) as Opportunity[],
      count: (response.data?.count || 0) as number,
      totalAmount: (response.data?.totalAmount || 0) as number,
      stageBreakdown: (response.data?.stageBreakdown || {}) as Record<
        string,
        { total_amount: number; count: number }
      >,
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
  async (params: { workspaceId: string; includeInactive?: boolean }) => {
    const { workspaceId, includeInactive = false } = params;
    const url = `/opportunities/statuses?workspaceId=${workspaceId}${includeInactive ? '&includeInactive=true' : ''}`;
    const response = await ApiClient.get(url);
    return response.data?.data || [];
  },
);

const getAffectedOpportunitiesForStageService = asyncHandlerClient(
  async (params: { stageId: string; workspaceId: string; limit?: number; offset?: number }) => {
    const { stageId, workspaceId, limit = 10, offset = 0 } = params;
    const response = await ApiClient.get(
      `/opportunities/statuses/${stageId}/affected?workspaceId=${workspaceId}&limit=${limit}&offset=${offset}`,
    );
    return response.data?.data as { total_count: number; records: { id: string; name: string }[] };
  },
);

const reassignOpportunityStageService = asyncHandlerClient(
  async (params: { stageId: string; new_status_id: string; workspace_id: string }) => {
    const { stageId, new_status_id, workspace_id } = params;
    const response = await ApiClient.patch(`/opportunities/statuses/${stageId}/reassign`, {
      new_status_id,
      workspace_id,
    });
    return response.data?.data as { reassigned_count: number; disabled_status_id: string };
  },
);

const createOpportunityStageService = asyncHandlerClient(
  async (payload: {
    workspace_id: string;
    status_name: string;
    color?: string;
    icon?: string;
    is_closed?: boolean;
  }) => {
    const response = await ApiClient.post('/opportunities/statuses', payload);
    return response.data?.data;
  },
);

const updateOpportunityStageService = asyncHandlerClient(
  async (
    stageId: string,
    payload: {
      status_name?: string;
      color?: string;
      icon?: string;
      is_closed?: boolean;
      is_active?: boolean;
    },
  ) => {
    const response = await ApiClient.patch(`/opportunities/statuses/${stageId}`, payload);
    return response.data?.data;
  },
);

const deleteOpportunityStageService = asyncHandlerClient(
  async (stageId: string) => {
    const response = await ApiClient.delete(`/opportunities/statuses/${stageId}`);
    return response.data?.data;
  },
);

const reorderOpportunityStagesService = asyncHandlerClient(
  async (payload: { workspaceId: string; orderedStatusIds: string[] }) => {
    const response = await ApiClient.put('/opportunities/statuses/reorder', payload);
    return response.data?.data;
  },
);

const deleteOpportunityService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.delete(`/opportunities/${id}`);
  return response.data?.data;
});

const importOpportunitiesService = asyncHandlerClient(
  async (payload: { workspaceId: string; data: any[] }) => {
    const response = await ApiClient.post('/opportunities/import', payload);
    return response.data;
  },
);

export {
  getOpportunitiesService,
  getOpportunityByIdService,
  updateOpportunityService,
  createOpportunityService,
  getOpportunityStatusesService,
  getAffectedOpportunitiesForStageService,
  reassignOpportunityStageService,
  createOpportunityStageService,
  updateOpportunityStageService,
  deleteOpportunityStageService,
  reorderOpportunityStagesService,
  deleteOpportunityService,
  importOpportunitiesService,
};
