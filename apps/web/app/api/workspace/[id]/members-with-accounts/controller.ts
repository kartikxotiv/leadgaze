import { NextRequest } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
  errorResponse,
} from '~/utils/response-handler';

/**
 * GET /api/workspace/{id}/members-with-accounts
 * 
 * Get workspace members with full account details for integrations.
 * Replaces: supabase.from('workspace_members').select(...accounts...)
 */
export const getWorkspaceMembersWithAccounts = catchAsync(
  async ({ 
    request,
    params 
  }: { 
    request: NextRequest;
    params: Record<string, string>;
  }) => {
    const supabase = getSupabaseServerClient() as any;
    const workspaceId = params.id;

    if (!workspaceId) {
      return errorResponse('Workspace ID is required', 400);
    }

    try {
      // Get workspace members with account details
      const { data: membersData, error } = await supabase
        .from('workspace_members')
        .select(`
          user_id,
          status,
          created_at,
          accounts:user_id (
            id,
            name,
            email,
            picture
          )
        `)
        .eq('workspace_id', workspaceId)
        .eq('status', 'accepted') // Only active members
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Workspace Members with Accounts] Error:', error);
        return errorResponse('Failed to fetch workspace members', 500);
      }

      // Transform data to match expected format
      const transformedData = (membersData || []).map((member: any) => ({
        user_id: member.user_id,
        status: member.status,
        created_at: member.created_at,
        accounts: {
          id: member.accounts?.id || member.user_id,
          name: member.accounts?.name || member.accounts?.email || 'Unknown User',
          email: member.accounts?.email || '',
          picture: member.accounts?.picture || null,
        }
      }));

      console.log(`[Workspace Members with Accounts] Retrieved ${transformedData.length} members for workspace ${workspaceId}`);

      return successDataResponse('Workspace members retrieved successfully', transformedData);

    } catch (error) {
      console.error('[Workspace Members with Accounts] Unexpected error:', error);
      return errorResponse(
        error instanceof Error 
          ? `Failed to fetch workspace members: ${error.message}`
          : 'Failed to fetch workspace members',
        500
      );
    }
  }
);