import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requireSubscriptionViewPermission } from '~/lib/server/subscription-permissions';
import {
  type RouteUser,
  parseInput,
  requireRouteUser,
  success,
} from '~/lib/subscriptions/api';
import { workspacePlansQuerySchema } from '~/lib/subscriptions/contracts';
import { catchAsync } from '~/utils/response-handler';

export const getSubscriptionNotifications = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = parseInput(workspacePlansQuerySchema, {
      workspaceId: request.nextUrl.searchParams.get('workspaceId'),
    });
    await requireSubscriptionViewPermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    const client = getSupabaseServerAdminClient();
    const result = await client
      .from('subscription_notifications')
      .select('id, event_type, title, message, action_url, read_at, created_at')
      .eq('workspace_id', input.workspaceId)
      .eq('recipient_id', actor.id)
      .eq('channel', 'in_app')
      .order('created_at', { ascending: false })
      .limit(20);
    if (result.error) throw result.error;
    return success(result.data ?? []);
  },
);
