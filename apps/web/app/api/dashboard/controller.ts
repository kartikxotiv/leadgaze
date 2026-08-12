import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { Database } from '@kit/supabase/database';
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

    // Resolve workspace access & hierarchy visible user IDs (p_require_shared_team: false matches entity controllers)
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const { data: accessResult, error: accessError } = await (
      adminClient as any
    ).rpc('resolve_workspace_access', {
      p_workspace_id: workspaceId,
      p_user_id: user.id,
      p_user_email: user.email || null,
      p_require_shared_team: false,
    });
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (accessError || !accessResult) {
      console.error('Workspace access resolution error:', accessError);
      throw accessError;
    }

    const {
      actor_account_id: actorAccountId,
      is_owner: isOwner,
      is_member: isMember,
      hierarchy_type: hierarchyType,
      visible_user_ids: rpcVisibleUserIds,
    } = accessResult;

    if (!isOwner && !isMember) {
      return NextResponse.json(
        { message: 'Forbidden: You are not a member of this workspace' },
        { status: 403 },
      );
    }

    const isAllVisible = isOwner || hierarchyType === 'all';
    const visibleUserIds = !isAllVisible
      ? (rpcVisibleUserIds || [actorAccountId])
      : null;

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

    // The dashboard RPC predates reminder priorities, so enrich its reminder
    // rows with the current value from core.reminders.
    const reminderIds = reminders
      .map((reminder) => reminder.id)
      .filter(Boolean);
    let remindersWithPriority = reminders;

    if (reminderIds.length > 0) {
      const { data: reminderPriorities, error: reminderPriorityError } =
        await adminClient
          .schema('core')
          .from('reminders')
          .select('id, priority')
          .in('id', reminderIds);

      if (reminderPriorityError) {
        console.error(
          '[Dashboard] Reminder priority fetch error:',
          reminderPriorityError,
        );
      } else {
        const priorityByReminderId = new Map(
          (reminderPriorities ?? []).map((reminder) => [
            reminder.id,
            reminder.priority,
          ]),
        );

        remindersWithPriority = reminders.map((reminder) => ({
          ...reminder,
          priority: priorityByReminderId.get(reminder.id),
        }));
      }
    }

    const upcomingTasks = [...remindersWithPriority, ...meetings]
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
