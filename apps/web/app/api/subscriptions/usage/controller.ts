import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requireSubscriptionViewPermission } from '~/lib/server/subscription-permissions';
import {
  type RouteUser,
  parseInput,
  requireRouteUser,
  success,
} from '~/lib/subscriptions/api';
import { usageQuerySchema } from '~/lib/subscriptions/contracts';
import { createSubscriptionService } from '~/lib/subscriptions/service';
import { catchAsync } from '~/utils/response-handler';

export const getSubscriptionUsage = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = parseInput(usageQuerySchema, {
      workspaceId: request.nextUrl.searchParams.get('workspaceId'),
      moduleKey: request.nextUrl.searchParams.get('moduleKey'),
    });
    await requireSubscriptionViewPermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    const service = createSubscriptionService(
      getSupabaseServerAdminClient() as never,
    );
    return success(await service.getUsage(input.workspaceId, input.moduleKey));
  },
);
