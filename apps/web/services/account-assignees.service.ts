import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface AccountAssignee {
  id: string;
  account_id: string;
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

export interface AccountAssigneeWithDetails extends AccountAssignee {
  assignee_name?: string;
  assignee_email?: string;
  assignee_picture?: string;
}

export interface AssignAccountPayload {
  assigned_to_user_id: string;
}

// Service Functions

/**
 * Get all assignees for a specific account
 * @param accountId - The account UUID
 * @returns Array of assignees with details
 */
const getAccountAssignees = asyncHandlerClient(
  async (accountId: string): Promise<AccountAssigneeWithDetails[]> => {
    const response = await ApiClient.get(`/accounts/${accountId}/assignees`);
    return response.data?.data || [];
  },
);

/**
 * Assign a user to an account
 * @param accountId - The account UUID
 * @param payload - Assignment details
 * @returns The created assignee record
 */
const assignAccountToUser = asyncHandlerClient(
  async (
    accountId: string,
    payload: AssignAccountPayload,
  ): Promise<AccountAssigneeWithDetails> => {
    const response = await ApiClient.post(`/accounts/${accountId}/assignees`, {
      assigned_to_user_id: payload.assigned_to_user_id,
    });
    return response.data?.data;
  },
);

/**
 * Unassign a user from an account
 * @param accountId - The account UUID
 * @param assigneeId - The assignee record ID to remove
 * @returns Success confirmation
 */
const unassignAccountFromUser = asyncHandlerClient(
  async (accountId: string, assigneeId: string): Promise<void> => {
    await ApiClient.delete(`/accounts/${accountId}/assignees/${assigneeId}`);
  },
);

// Export all service functions
export { getAccountAssignees, assignAccountToUser, unassignAccountFromUser };
