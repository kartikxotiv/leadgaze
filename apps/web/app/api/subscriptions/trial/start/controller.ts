import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requireSubscriptionBillingPermission } from '~/lib/server/subscription-permissions';
import {
  type RouteUser,
  parseJson,
  requireRouteUser,
  success,
} from '~/lib/subscriptions/api';
import { startTrialRequestSchema } from '~/lib/subscriptions/contracts';
import { createSubscriptionService } from '~/lib/subscriptions/service';
import { catchAsync } from '~/utils/response-handler';

export const startSubscriptionTrial = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = await parseJson(request, startTrialRequestSchema);
    await requireSubscriptionBillingPermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    const service = createSubscriptionService(
      getSupabaseServerAdminClient() as never,
    );
    return success(await service.startTrial(input, actor.id));
  },
);
