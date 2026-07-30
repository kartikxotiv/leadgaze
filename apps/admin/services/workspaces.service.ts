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
