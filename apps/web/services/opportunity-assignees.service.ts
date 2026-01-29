import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface OpportunityAssignee {
  id: string;
  opportunity_id: string;
  assigned_to_user_id: string;
  workspace_id: string;
  is_primary_assignee: boolean;
  assigned_by: string;
  assignment_reason?: string;
  notes?: string;
  assignment_status: 'active' | 'inactive' | 'declined';
  assigned_at: string;
  unassigned_at?: string;
  created_at: string;
}

export interface OpportunityAssigneeWithDetails extends OpportunityAssignee {
  assignee_name?: string;
  assignee_email?: string;
  assignee_picture?: string;
}

export interface AssignOpportunityPayload {
  assigned_to_user_id: string;
}

// Service Functions

/**
 * Get all assignees for a specific opportunity
 * @param opportunityId - The opportunity UUID
 * @returns Array of assignees with details
 */
const getOpportunityAssignees = asyncHandlerClient(
  async (opportunityId: string): Promise<OpportunityAssigneeWithDetails[]> => {
    const response = await ApiClient.get(`/opportunities/${opportunityId}/assignees`);
    return response.data?.data || [];
  },
);

/**
 * Assign a user to an opportunity
 * @param opportunityId - The opportunity UUID
 * @param payload - Assignment details
 * @returns The created assignee record
 */
const assignOpportunityToUser = asyncHandlerClient(
  async (
    opportunityId: string,
    payload: AssignOpportunityPayload,
  ): Promise<OpportunityAssigneeWithDetails> => {
    const response = await ApiClient.post(`/opportunities/${opportunityId}/assignees`, {
      assigned_to_user_id: payload.assigned_to_user_id,
    });
    return response.data?.data;
  },
);

/**
 * Unassign a user from an opportunity
 * @param opportunityId - The opportunity UUID
 * @param assigneeId - The assignee record ID to remove
 * @returns Success confirmation
 */
const unassignOpportunityFromUser = asyncHandlerClient(
  async (opportunityId: string, assigneeId: string): Promise<void> => {
    await ApiClient.delete(`/opportunities/${opportunityId}/assignees/${assigneeId}`);
  },
);

// Export all service functions
export {
  getOpportunityAssignees,
  assignOpportunityToUser,
  unassignOpportunityFromUser,
};
