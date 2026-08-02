import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
import { 
  catchAsync,
  successDataResponse,
  errorResponse,
} from '~/utils/response-handler';

/**
 * POST /api/auth/workspace-init
 * 
 * Initializes workspace session data in a single optimized API call.
 * Replaces 15+ individual API calls that happen on login/workspace selection.
 * 
 * Body params:
 * - workspaceId (optional): Specific workspace to initialize. If not provided:
 *   - Auto-selects if user has only 1 workspace
 *   - Returns workspaces list for user to choose from
 * 
 * Returns:
 * - user_workspaces: All workspaces user has access to with roles/permissions
 * - current_workspace: Team members and basic metrics for selected workspace  
 * - user_preferences: User settings and preferences
 * - session_metadata: Initialization metadata and flags
 */
export const POST = catchAsync(async (request: NextRequest) => {
  const supabase = getSupabaseServerClient();
  const adminClient = getSupabaseServerAdminClient<Database>();
  
  // Parse request body
  let workspaceId: string | null = null;
  try {
    const body = await request.json();
    workspaceId = body.workspaceId || null;
  } catch {
    // Body is optional, continue with null workspaceId
  }
  
  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('Unauthorized - Please log in again');
  }

  try {
    console.log(`[Workspace Init] Starting initialization for user ${user.id}, workspace: ${workspaceId || 'auto-detect'}`);
    
    // Single RPC call replaces 15+ individual queries
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: initData, error } = await (adminClient as any).rpc(
      'initialize_workspace_session',
      {
        p_user_id: user.id,
        p_workspace_id: workspaceId,
        p_user_email: user.email || null,
      }
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (error) {
      console.error('[Workspace Init] RPC error:', error);
      return errorResponse(`Failed to initialize workspace session: ${error.message}`, 500);
    }

    if (!initData || !initData.success) {
      console.error('[Workspace Init] Invalid RPC response:', initData);
      throw new Error('Invalid initialization response');
    }

    const {
      user_workspaces,
      current_workspace,
      user_preferences,
      session_metadata,
    } = initData;

    // Log performance metrics
    console.log(`[Workspace Init] Success for user ${user.id}:`, {
      workspaces_count: user_workspaces?.length || 0,
      team_members_count: current_workspace?.team_members?.length || 0,
      selected_workspace: session_metadata?.workspace_id || 'none',
      auto_selected: session_metadata?.auto_selected_workspace || false,
    });

    return successDataResponse('Workspace session initialized successfully', {
      user_workspaces: user_workspaces || [],
      current_workspace: current_workspace || {
        team_members: [],
        dashboard_data: {},
      },
      user_preferences: user_preferences || {},
      session_metadata: session_metadata || {},
    });

  } catch (error) {
    console.error('[Workspace Init] Unexpected error:', error);
    throw new Error(
      error instanceof Error 
        ? `Initialization failed: ${error.message}`
        : 'Failed to initialize workspace session',
    );
  }
});

/**
 * GET /api/auth/workspace-init
 * 
 * Health check endpoint to verify workspace initialization is working
 */
export const GET = catchAsync(async () => {
  return successDataResponse('Workspace initialization endpoint is healthy', {
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});