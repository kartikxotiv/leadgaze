import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireSubscriptionBillingPermission } from '~/lib/server/subscription-permissions';
import { BackendBillingService } from '~/lib/subscriptions/backend-billing-service';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * POST /api/subscriptions/update-seats
 *
 * Seat increases create a backend invoice and email its Razorpay payment URL.
 * The increase is applied only after the signed webhook confirms payment.
 * Seat decreases are scheduled for the current period end and never call a
 * payment provider. Active module entitlements bypass billing.
 */
export const updateSeats = catchAsync(
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
      seatId?: string;
      newQuantity?: number;
      discountCode?: string;
    };
    if (
      !body.seatId ||
      !Number.isInteger(body.newQuantity) ||
      Number(body.newQuantity) < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'seatId and newQuantity (a positive integer) are required',
        },
        { status: 400 },
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = getSupabaseServerAdminClient() as any;
    const seat = await adminClient
      .from('workspace_module_seats')
      .select('workspace_id')
      .eq('id', body.seatId)
      .single();
    if (seat.error || !seat.data) {
      return NextResponse.json(
        { success: false, message: 'Seat subscription not found' },
        { status: 404 },
      );
    }
    await requireSubscriptionBillingPermission({
      accountId: user.id,
      workspaceId: seat.data.workspace_id,
    });

    const data = await new BackendBillingService(adminClient).changeSeats({
      seatId: body.seatId,
      newQuantity: Number(body.newQuantity),
      actor: user,
      discountCode: body.discountCode,
    });
    return NextResponse.json({
      success: true,
      message:
        data.changeStatus === 'pending' && 'url' in data
          ? 'Invoice created. The additional seats activate after payment.'
          : data.changeStatus === 'pending'
            ? 'Seat reduction scheduled for the end of the current period.'
            : 'Seat count updated.',
      data,
    });
  },
);
