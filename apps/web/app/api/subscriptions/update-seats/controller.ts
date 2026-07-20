import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireSubscriptionManagePermission } from '~/lib/server/subscription-permissions';
import { getStripeClient } from '~/lib/stripe/stripe-client';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * POST /api/subscriptions/update-seats
 *
 * Updates the seat quantity for an existing Stripe subscription.
 * Stripe handles proration automatically.
 * The webhook (customer.subscription.updated) syncs the DB.
 *
 * For trial seats (no real Stripe subscription), returns an error
 * directing the user to the checkout flow.
 *
 * Body: { seatId, newQuantity, subscriptionItemId? }
 */
export const updateSeatsViaStripe = catchAsync(
  async ({
    request,
    user,
  }: {
    request: NextRequest;
    user?: { id: string };
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = getSupabaseServerAdminClient() as any;
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

    const body = await request.clone().json();
    const { seatId, newQuantity, subscriptionItemId } = body;

    if (!seatId || newQuantity == null || newQuantity < 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'seatId and newQuantity (>= 1) are required',
        },
        { status: 400 },
      );
    }

    // ── Fetch the seat row ────────────────────────────────────────
    const { data: seat, error: seatError } = await adminClient
      .from('workspace_module_seats')
      .select(
        'id, workspace_id, seats_used, seats_purchased, status, provider_subscription_id, provider_metadata, workspaces!inner(owner_id)',
      )
      .eq('id', seatId)
      .single();

    if (seatError || !seat) {
      return NextResponse.json(
        { success: false, message: 'Seat subscription not found' },
        { status: 404 },
      );
    }

    await requireSubscriptionManagePermission({
      accountId: user.id,
      workspaceId: seat.workspace_id,
    });

    // Cannot reduce below used seats
    if (newQuantity < seat.seats_used) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot reduce seats below ${seat.seats_used} (currently assigned). Remove seat assignments first.`,
        },
        { status: 400 },
      );
    }

    // No change needed
    if (newQuantity === seat.seats_purchased) {
      return NextResponse.json({
        success: true,
        message: 'Seat count unchanged',
      });
    }

    // ── Detect trial seats — redirect to checkout ───────────────────
    const isTrialSeat =
      seat.status === 'trialing' ||
      !seat.provider_subscription_id ||
      seat.provider_subscription_id.startsWith('trial_sub_');

    if (isTrialSeat) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Your workspace is on a trial plan. Please subscribe to update seat counts.',
          requiresCheckout: true,
        },
        { status: 400 },
      );
    }

    // ── Update Stripe subscription item quantity ──────────────────
    const stripe = getStripeClient();

    // Get the Stripe subscription item ID from provider_metadata or request body
    const meta = seat.provider_metadata ?? {};
    const stripeSubscriptionItemId =
      subscriptionItemId || meta.stripe_subscription_item_id;

    if (!stripeSubscriptionItemId) {
      // Try to find it from the Stripe subscription directly
      try {
        const subscription = await stripe.subscriptions.retrieve(
          seat.provider_subscription_id,
        );

        // If only one item, use it
        if (subscription.items.data.length === 1) {
          const subItem = subscription.items.data[0];
          if (subItem) {
            return await performStripeUpdate(
              stripe,
              adminClient,
              seat.provider_subscription_id,
              subItem.id,
              newQuantity,
              subscription.metadata,
              user.id,
              seatId,
            );
          }
        }

        return NextResponse.json(
          {
            success: false,
            message:
              'Could not determine which subscription item to update. Please contact support.',
          },
          { status: 400 },
        );
      } catch {
        return NextResponse.json(
          {
            success: false,
            message:
              'Stripe subscription item ID not found. Please contact support.',
          },
          { status: 400 },
        );
      }
    }

    try {
      const subscription = await stripe.subscriptions.retrieve(
        seat.provider_subscription_id,
      );

      return await performStripeUpdate(
        stripe,
        adminClient,
        seat.provider_subscription_id,
        stripeSubscriptionItemId,
        newQuantity,
        subscription.metadata,
        user.id,
        seatId,
      );
    } catch (err) {
      console.error('Stripe subscription update error:', err);
      return NextResponse.json(
        {
          success: false,
          message:
            err instanceof Error
              ? err.message
              : 'Failed to update subscription in Stripe',
        },
        { status: 500 },
      );
    }
  },
);

/**
 * Perform the actual Stripe subscription item quantity update.
 */
async function performStripeUpdate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stripe: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  subscriptionId: string,
  subscriptionItemId: string,
  newQuantity: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingMetadata: any,
  userId: string,
  seatId: string,
) {
  // Update the subscription item quantity (Stripe handles proration)
  await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscriptionItemId,
        quantity: newQuantity,
      },
    ],
    metadata: {
      ...existingMetadata,
      updated_by: userId,
      update_reason: 'seat_quantity_change',
    },
  });

  // Optimistically update the DB for responsiveness
  await adminClient
    .from('workspace_module_seats')
    .update({
      seats_purchased: newQuantity,
      updated_by: userId,
    })
    .eq('id', seatId);

  return NextResponse.json({
    success: true,
    message: `Seat count updated to ${newQuantity}. Prorated charges will appear on your next invoice.`,
  });
}
