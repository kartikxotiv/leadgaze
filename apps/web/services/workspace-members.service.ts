import { asyncHandlerClient } from '~/utils/async-handler';
import ApiClient from '~/utils/axios-client';

export interface WorkspaceMemberForAssignment {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role_id: string;
  product_key?: string | null;
}

/**
 * Get all active workspace members for assignment
 * @param workspaceId - The workspace UUID
 * @param productKey - Optional module/product key to filter by
 * @returns Array of workspace members
 */
const getWorkspaceMembersService = asyncHandlerClient(
  async (workspaceId: string, productKey?: string): Promise<WorkspaceMemberForAssignment[]> => {
    const url = productKey
      ? `/team-members?workspaceId=${workspaceId}&productKey=${productKey}`
      : `/team-members?workspaceId=${workspaceId}`;
    const response = await ApiClient.get(url);

    // Map the response to include the fields we need for assignment
    return (response.data?.data || []).map((member: any) => ({
      id: member.user_id || member.id,
      email: member.user?.email || member.email || '',
      full_name:
        member.user?.user_metadata?.full_name || member.full_name || '',
      avatar_url: member.user?.user_metadata?.avatar_url || member.avatar_url,
      role_id: member.role_id,
    }));
  },
);

export { getWorkspaceMembersService };
