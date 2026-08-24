import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface SubscriptionItem {
  id: string;
  workspace_name: string;
  plan: string;
  amount: string;
  billing_cycle: string;
  status: string;
  renewal_date: string;
}

export interface GetSubscriptionsParams {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: string | string[];
}

export const getSubscriptionsService = asyncHandlerClient(
  async (params: GetSubscriptionsParams = {}) => {
    const {
      page = 1,
      limit = 25,
      searchTerm = '',
      status = '',
    } = params;

    const statusParam = Array.isArray(status) ? status.join(',') : status;

    const response = await ApiClient.get(
      `/subscriptions?page=${page}&limit=${limit}&searchTerm=${encodeURIComponent(
        searchTerm,
      )}&status=${encodeURIComponent(statusParam)}`,
    );

    return {
      data: (response.data?.data?.data || response.data?.data || []) as SubscriptionItem[],
      count: (response.data?.data?.count ?? response.data?.count ?? 0) as number,
      metrics: response.data?.data?.metrics || response.data?.metrics || {},
    };
  },
);
