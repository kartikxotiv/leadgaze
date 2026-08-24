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
import { SubscriptionApiError } from '~/lib/subscriptions/errors';
import { catchAsync } from '~/utils/response-handler';

export const getEntitlementContext = catchAsync(
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
    const client = getSupabaseServerAdminClient();
    const result = await client.rpc('get_workspace_entitlement_context', {
      p_workspace_id: input.workspaceId,
      p_module_key: input.moduleKey,
    });
    if (result.error) throw result.error;
    if (!result.data) {
      throw new SubscriptionApiError(
        'Explicit entitlement context not found',
        404,
        'ENTITLEMENT_CONTEXT_MISSING',
      );
    }
    return success(result.data);
  },
);
