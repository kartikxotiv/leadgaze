import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface ContactAssignee {
  id: string;
  contact_id: string;
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

export interface ContactAssigneeWithDetails extends ContactAssignee {
  assignee_name?: string;
  assignee_email?: string;
  assignee_picture?: string;
}

export interface AssignContactPayload {
  assigned_to_user_id: string;
}

// Service Functions

/**
 * Get all assignees for a specific contact
 * @param contactId - The contact UUID
 * @returns Array of assignees with details
 */
const getContactAssignees = asyncHandlerClient(
  async (contactId: string): Promise<ContactAssigneeWithDetails[]> => {
    const response = await ApiClient.get(`/contacts/${contactId}/assignees`);
    return response.data?.data || [];
  },
);

/**
 * Assign a user to a contact
 * @param contactId - The contact UUID
 * @param payload - Assignment details
 * @returns The created assignee record
 */
const assignContactToUser = asyncHandlerClient(
  async (
    contactId: string,
    payload: AssignContactPayload,
  ): Promise<ContactAssigneeWithDetails> => {
    const response = await ApiClient.post(`/contacts/${contactId}/assignees`, {
      assigned_to_user_id: payload.assigned_to_user_id,
    });
    return response.data?.data;
  },
);

/**
 * Unassign a user from a contact
 * @param contactId - The contact UUID
 * @param assigneeId - The assignee record ID to remove
 * @returns Success confirmation
 */
const unassignContactFromUser = asyncHandlerClient(
  async (contactId: string, assigneeId: string): Promise<void> => {
    await ApiClient.delete(`/contacts/${contactId}/assignees/${assigneeId}`);
  },
);

// Export all service functions
export { getContactAssignees, assignContactToUser, unassignContactFromUser };
