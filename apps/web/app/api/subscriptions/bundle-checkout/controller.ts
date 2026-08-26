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
import { bundleCheckoutRequestSchema } from '~/lib/subscriptions/contracts';
import { catchAsync } from '~/utils/response-handler';

export const createBundleCheckout = catchAsync(
  async ({ request, user }: { request: NextRequest; user?: RouteUser }) => {
    const actor = requireRouteUser(user);
    const input = await parseJson(request, bundleCheckoutRequestSchema);
    await requireSubscriptionBillingPermission({
      accountId: actor.id,
      workspaceId: input.workspaceId,
    });

    // The additive billing tables may be ahead of generated Supabase types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = getSupabaseServerAdminClient() as any;
    const existing = await client
      .from('workspace_module_subscriptions')
      .select('id')
      .eq('workspace_id', input.workspaceId)
      .eq('status', 'active')
      .limit(1);
    if (existing.error) throw existing.error;

    const result = await new BackendBillingService(client).createBundleInvoice({
      workspaceId: input.workspaceId,
      bundleKey: input.bundleKey,
      billingCycle: input.billingCycle,
      seats: input.seats,
      purpose: existing.data?.length ? 'bundle_upgrade' : 'bundle_purchase',
      actor,
      discountCode: input.discountCode,
      idempotencyKey: input.requestId
        ? `bundle_checkout:${input.workspaceId}:${input.requestId}`
        : undefined,
      returnUrl: input.returnUrl,
    });
    return success(result);
  },
);
