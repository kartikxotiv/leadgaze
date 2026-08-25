import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireSubscriptionBillingPermission } from '~/lib/server/subscription-permissions';
import type { SubscriptionModuleKey } from '~/lib/subscriptions/contracts';
import { createSubscriptionService } from '~/lib/subscriptions/service';

import { catchAsync } from '../../../../utils/response-handler';

/** Schedules module removal at the backend-owned period boundary. */
export const cancelSubscription = catchAsync(
  async ({
    request,
    user,
  }: {
    request: NextRequest;
    user?: { id: string };
  }) => {
    const supabase = getSupabaseServerClient();
    if (!user) {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 },
        );
      }
      user = authUser;
    }
    const body = (await request.json()) as {
      workspaceId?: string;
      productKey?: SubscriptionModuleKey;
    };
    if (!body.workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );
    }
    await requireSubscriptionBillingPermission({
      accountId: user.id,
      workspaceId: body.workspaceId,
    });

    const service = createSubscriptionService(
      getSupabaseServerAdminClient() as never,
    );
    const modules = body.productKey
      ? [body.productKey]
      : (['sales', 'service_cloud'] as const);
    const scheduled = [];
    for (const moduleKey of modules) {
      try {
        scheduled.push(
          await service.removeModule(body.workspaceId, moduleKey, user.id),
        );
      } catch (error) {
        if (body.productKey) throw error;
      }
    }
    if (scheduled.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No active subscription found' },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      message:
        'Cancellation is scheduled. Access remains active through the current period.',
      fullCancellation: !body.productKey,
      data: scheduled,
    });
  },
);
