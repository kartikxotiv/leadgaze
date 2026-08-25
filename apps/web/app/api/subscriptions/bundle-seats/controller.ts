import type { NextRequest } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requireSubscriptionBillingPermission } from '~/lib/server/subscription-permissions';
import {
  type RouteUser,
  parseJson,
  requireRouteUser,
  success,
} from '~/lib/subscriptions/api';
import { BackendBillingService } from '~/lib/subscriptions/backend-billing-service';
import { bundleSeatChangeRequestSchema } from '~/lib/subscriptions/contracts';
import { catchAsync } from '~/utils/response-handler';

export const updateBundleSeats = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = await parseJson(request, bundleSeatChangeRequestSchema);
    await requireSubscriptionBillingPermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });
    const result = await new BackendBillingService(
      getSupabaseServerAdminClient() as never,
    ).changeBundleSeats({
      workspaceId: input.workspaceId,
      bundleKey: input.bundleKey,
      newQuantity: input.newQuantity,
      actor,
      discountCode: input.discountCode,
    });
    return success(result);
  },
);
