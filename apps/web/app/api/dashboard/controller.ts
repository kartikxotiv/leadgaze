import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '~/lib/database.types';
import { getHierarchyVisibleUserIds } from '~/lib/permissions/hierarchy-utils';
import { catchAsync, successDataResponse } from '~/utils/response-handler';

/**
 * GET /api/dashboard
 * Fetch aggregate metrics for the dashboard
 */
export const getDashboardMetrics = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient<Database>();
    const url = new URL(request.url);
    const workspaceId = url.searchParams.get('workspaceId');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Resolve account id used by CRM/workspace tables.
    let actorAccountId = user.id;
    const { data: accountById } = await adminClient
      .from('accounts')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!accountById?.id && user.email) {
      const { data: accountByEmail } = await adminClient
        .from('accounts')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (accountByEmail?.id) {
        actorAccountId = accountByEmail.id;
      }
    }

    // Check if user is workspace owner
    const { data: workspace, error: workspaceError } = await adminClient
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError) {
      console.error('Workspace fetch error:', workspaceError);
      throw workspaceError;
    }

    const isOwner =
      workspace?.owner_id === actorAccountId || workspace?.owner_id === user.id;

    const { data: memberships } = await adminClient
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', actorAccountId)
      .eq('status', 'accepted');

    const membership = memberships && memberships.length > 0 ? memberships[0] : null;

    if (!isOwner && !membership) {
      return NextResponse.json(
        { message: 'Forbidden: You are not a member of this workspace' },
        { status: 403 },
      );
    }

    let hierarchyFilter:
      | { type: 'all' }
      | { type: 'restricted'; userIds: string[] } = { type: 'all' };

    if (!isOwner) {
      hierarchyFilter = await getHierarchyVisibleUserIds(
        adminClient,
        workspaceId,
        actorAccountId,
      );
    }

    // Use the optimized RPC function for single database transaction
    const isAllVisible = hierarchyFilter.type === 'all';
    const visibleUserIds =
      hierarchyFilter.type === 'restricted' ? hierarchyFilter.userIds : null;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: rpcData, error: rpcError } = await adminClient.rpc(
      'get_sales_dashboard_stats' as any,
      {
        p_workspace_id: workspaceId,
        p_is_all_visible: isAllVisible,
        p_visible_user_ids: visibleUserIds,
        p_user_id: actorAccountId,
        p_date_from: from || null,
        p_date_to: to || null,
      },
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (rpcError) {
      console.error('[Dashboard] RPC error:', rpcError);
      throw rpcError;
    }

    // Merge reminders + meetings into upcomingTasks (sorted by dueDate, limit 10)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reminders = (rpcData?.reminders ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meetings = (rpcData?.meetings ?? []) as any[];
    const upcomingTasks = [...reminders, ...meetings]
      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
      .slice(0, 10);

    return successDataResponse('Dashboard metrics retrieved successfully', {
      leads: rpcData.leads,
      contacts: rpcData.contacts,
      accounts: rpcData.accounts,
      opportunities: rpcData.opportunities,
      pipeline: rpcData.pipeline,
      upcomingTasks,
    });
  },
);
