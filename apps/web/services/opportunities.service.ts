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
  async (workspaceId: string) => {
    const response = await ApiClient.get(
      `/opportunities?workspaceId=${workspaceId}`,
    );
    return response.data?.data || [];
  },
);

const getOpportunityByIdService = asyncHandlerClient(async (id: string) => {
  const response = await ApiClient.get(`/opportunities/${id}`);
  return response.data?.data || null;
});

export { getOpportunitiesService, getOpportunityByIdService };
