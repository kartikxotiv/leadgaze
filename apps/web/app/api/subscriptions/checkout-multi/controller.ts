import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireSubscriptionBillingPermission } from '~/lib/server/subscription-permissions';
import { BackendBillingService } from '~/lib/subscriptions/backend-billing-service';
import type {
  BillingCycle,
  PlanKey,
  SubscriptionModuleKey,
} from '~/lib/subscriptions/contracts';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * Compatibility route for older multi-module clients. Each module receives an
 * independent backend invoice so payment and activation stay idempotent.
 */
export const createMultiProductCheckout = catchAsync(
  async ({
    request,
    user,
  }: {
    request: NextRequest;
    user?: { id: string; email?: string };
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
      user = { id: authUser.id, email: authUser.email };
    }

    const body = (await request.json()) as {
      workspaceId?: string;
      items?: Array<{
        productKey: SubscriptionModuleKey;
        planKey?: PlanKey;
        seats: number;
        discountCode?: string;
      }>;
      billingCycle?: BillingCycle;
    };
    if (!body.workspaceId || !body.items?.length) {
      return NextResponse.json(
        { success: false, message: 'workspaceId and items are required' },
        { status: 400 },
      );
    }
    await requireSubscriptionBillingPermission({
      accountId: user.id,
      workspaceId: body.workspaceId,
    });

    const billing = new BackendBillingService(
      getSupabaseServerAdminClient() as never,
    );
    const invoices = [];
    for (const item of body.items) {
      invoices.push(
        await billing.createPlanInvoice({
          workspaceId: body.workspaceId,
          moduleKey: item.productKey,
          planKey: item.planKey ?? 'growth',
          billingCycle: body.billingCycle ?? 'monthly',
          seats: item.seats,
          purpose: 'initial_purchase',
          actor: user,
          discountCode: item.discountCode,
        }),
      );
    }
    return NextResponse.json({
      success: true,
      data: {
        url: invoices[0]?.url,
        sessionId: invoices[0]?.sessionId,
        invoices,
      },
    });
  },
);
