import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import {
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

/**
 * GET /api/workspaces/settings?workspaceId=xxx
 *
 * Consolidated workspace settings endpoint — replaces:
 *   - Direct Supabase browser query in general-settings.tsx
 *   - GET /workspaces/preferences (2 DB queries)
 *   - GET /workspaces/currencies (1 DB query)
 *
 * Now: 1 RPC call via get_workspace_settings()
 */
export const getWorkspaceSettings = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient() as any;

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Auth check — ensure user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Single RPC replaces 3+ DB queries
    const { data, error } = await adminClient.rpc('get_workspace_settings', {
      p_workspace_id: workspaceId,
    });

    if (error) {
      console.error('[getWorkspaceSettings] RPC error:', error);
      return NextResponse.json(
        { message: 'Failed to fetch workspace settings' },
        { status: 500 },
      );
    }

    return successDataResponse(data);
  },
);
