'use client';

import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

// Type Definitions
export interface LeadAssignee {
  id: string;
  lead_id: string;
  assigned_to_user_id: string;
  workspace_id: string;
  is_primary_assignee: boolean;
  assignment_status: 'active' | 'inactive' | 'declined';
  assigned_at: string;
  unassigned_at?: string | null;
  updated_at: string;
  created_at: string;
}

export interface LeadAssigneeWithDetails extends LeadAssignee {
  assignee_name?: string;
  assignee_email?: string;
  assignee_picture?: string | null;
}

export interface AssignLeadPayload {
  assigned_to_user_id: string;
}

// Service Functions

/**
 * Get all assignees for a specific lead
 * @param leadId - The lead UUID
 * @returns Array of assignees with details
 */
const getLeadAssignees = asyncHandlerClient(
  async (leadId: string): Promise<LeadAssigneeWithDetails[]> => {
    const response = await ApiClient.get(`/leads/${leadId}/assignees`);
    return response.data || [];
  },
);

/**
 * Assign a user to a lead
 * @param leadId - The lead UUID
 * @param payload - Assignment details
 * @returns The created assignee record
 */
const assignLeadToUser = asyncHandlerClient(
  async (
    leadId: string,
    payload: AssignLeadPayload,
  ): Promise<LeadAssigneeWithDetails> => {
    const response = await ApiClient.post(`/leads/${leadId}/assignees`, {
      assigned_to_user_id: payload.assigned_to_user_id,
    });
    return response.data;
  },
);

/**
 * Unassign a user from a lead
 * @param leadId - The lead UUID
 * @param assigneeId - The assignee record ID to remove
 * @returns Success confirmation
 */
const unassignLeadFromUser = asyncHandlerClient(
  async (leadId: string, assigneeId: string): Promise<void> => {
    await ApiClient.delete(`/leads/${leadId}/assignees/${assigneeId}`);
  },
);

// Export all service functions
export { getLeadAssignees, assignLeadToUser, unassignLeadFromUser };
