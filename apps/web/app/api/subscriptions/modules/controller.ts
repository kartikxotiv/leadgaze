import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requireSubscriptionBillingPermission } from '~/lib/server/subscription-permissions';
import {
  type RouteUser,
  parseJson,
  requireRouteUser,
  success,
} from '~/lib/subscriptions/api';
import {
  addModuleRequestSchema,
  removeModuleRequestSchema,
} from '~/lib/subscriptions/contracts';
import { createSubscriptionService } from '~/lib/subscriptions/service';
import { catchAsync } from '~/utils/response-handler';

export const addSubscriptionModule = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = await parseJson(request, addModuleRequestSchema);
    await requireSubscriptionBillingPermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    const service = createSubscriptionService(
      getSupabaseServerAdminClient() as never,
    );
    return success(await service.addModule(input, actor.id));
  },
);

export const removeSubscriptionModule = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = await parseJson(request, removeModuleRequestSchema);
    await requireSubscriptionBillingPermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    const service = createSubscriptionService(
      getSupabaseServerAdminClient() as never,
    );
    return success(
      await service.removeModule(input.workspaceId, input.moduleKey, actor.id),
    );
  },
);
