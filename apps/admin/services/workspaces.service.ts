import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface WorkspaceItem {
  id: string;
  name: string;
  slug: string;
  domain: string;
  owner_email: string;
  plan: 'Enterprise' | 'Pro' | 'Starter' | 'Trial';
  status: 'Active' | 'Trial' | 'Suspended' | 'Cancelled';
  members_count: number;
  mrr: string;
  created_at: string;
}

export interface GetWorkspacesParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  plan?: string | string[];
  status?: string | string[];
  sortColumn?: string;
  sortDirection?: string;
  createdAtFrom?: string;
  createdAtTo?: string;
}

export const getWorkspacesService = asyncHandlerClient(
  async (params: GetWorkspacesParams = {}) => {
    const {
      page = 1,
      limit = 15,
      searchTerm = '',
      plan = '',
      status = '',
      sortColumn = '',
      sortDirection = '',
      createdAtFrom = '',
      createdAtTo = '',
    } = params;

    const planParam = Array.isArray(plan) ? plan.join(',') : plan;
    const statusParam = Array.isArray(status) ? status.join(',') : status;

    const response = await ApiClient.get(
      `/workspaces?page=${page}&limit=${limit}&searchTerm=${encodeURIComponent(
        searchTerm,
      )}&plan=${encodeURIComponent(planParam)}&status=${encodeURIComponent(
        statusParam,
      )}&sortColumn=${encodeURIComponent(
        sortColumn,
      )}&sortDirection=${encodeURIComponent(
        sortDirection,
      )}&createdAtFrom=${encodeURIComponent(
        createdAtFrom,
      )}&createdAtTo=${encodeURIComponent(createdAtTo)}`,
    );

    return {
      data: (response.data?.data?.data || response.data?.data || []) as WorkspaceItem[],
      count: (response.data?.data?.count ?? response.data?.count ?? 0) as number,
    };
  },
);

export const getWorkspaceByIdService = asyncHandlerClient(
  async (params: { id: string }) => {
    const response = await ApiClient.get(`/workspaces/${params.id}`);
    return (response.data?.data || response.data) as any;
  },
);

export const createWorkspaceService = asyncHandlerClient(
  async (params: { name: string; slug: string; owner_id?: string }) => {
    const response = await ApiClient.post('/workspaces', params);
    return response.data?.data || response.data;
  },
);

export const updateWorkspaceService = asyncHandlerClient(
  async (params: { id: string; name?: string; slug?: string; is_active?: boolean }) => {
    const { id, ...data } = params;
    const response = await ApiClient.patch(`/workspaces/${id}`, data);
    return response.data?.data || response.data;
  },
);

export const getWorkspaceMembersService = asyncHandlerClient(
  async (params: { workspaceId: string; module?: string; page?: number; limit?: number }) => {
    const { workspaceId, module = 'All', page = 1, limit = 25 } = params;
    const response = await ApiClient.get(`/workspaces/${workspaceId}/members?module=${encodeURIComponent(module)}&page=${page}&limit=${limit}`);
    return {
      data: (response.data?.data?.data || response.data?.data || []) as any[],
      count: (response.data?.data?.count ?? response.data?.count ?? 0) as number,
    };
  },
);

export const removeWorkspaceMemberService = asyncHandlerClient(
  async (params: { workspaceId: string; memberId: string }) => {
    const { workspaceId, memberId } = params;
    const response = await ApiClient.delete(`/workspaces/${workspaceId}/members/${memberId}`);
    return response.data?.data || response.data;
  },
);

export const getWorkspaceUsageAnalyticsService = asyncHandlerClient(
  async (params: { workspaceId: string }) => {
    const response = await ApiClient.get(`/workspaces/${params.workspaceId}/usage-analytics`);
    return response.data?.data || response.data;
  },
);

