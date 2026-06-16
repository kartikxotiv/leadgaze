import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireSubscriptionManagePermission } from '~/lib/server/subscription-permissions';
import { getStripeClient } from '~/lib/stripe/stripe-client';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * POST /api/subscriptions/cancel
 *
 * Two modes:
 *
 * 1. Full cancellation — no productKey:
 *    Cancels the entire Stripe subscription. All module seats are marked
 *    'cancelled' via the customer.subscription.deleted webhook.
 *
 * 2. Module removal — with productKey:
 *    Removes a single module (line item) from the Stripe subscription.
 *    Only allowed when the module has seats_used <= 1 (only the owner).
 *    If this is the last line item the entire subscription is cancelled instead.
 *
 * Body: { workspaceId, productKey? }
 */
export const cancelSubscription = catchAsync(
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
    const { workspaceId, productKey } = body as {
      workspaceId: string;
      productKey?: string;
    };

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // ── Verify ownership ────────────────────────────────────────
    const { data: workspace, error: wsError } = await adminClient
      .from('workspaces')
      .select('id, owner_id')
      .eq('id', workspaceId)
      .single();

    if (wsError || !workspace) {
      return NextResponse.json(
        { success: false, message: 'Workspace not found' },
        { status: 404 },
      );
    }

    await requireSubscriptionManagePermission({
      accountId: user.id,
      workspaceId,
    });

    // ── Fetch seat(s) ──────────────────────────────────────────
    const seatQuery = adminClient
      .from('workspace_module_seats')
      .select(
        'id, product_id, seats_used, seats_purchased, status, provider_subscription_id, provider_metadata, subscription_products(product_key)',
      )
      .eq('workspace_id', workspaceId)
      .neq('status', 'cancelled');

    const { data: allSeats, error: seatsError } = await seatQuery;

    if (seatsError || !allSeats || allSeats.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No active subscription found' },
        { status: 404 },
      );
    }

    // Filter by productKey in JS to avoid unreliable FK-relationship filtering
    const seats = productKey
      ? allSeats.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.subscription_products?.product_key === productKey,
        )
      : allSeats;

    if (seats.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'No active subscription found for this module',
        },
        { status: 404 },
      );
    }

    // ── Get Stripe subscription ID ─────────────────────────────
    const paidSeat = seats.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (s: any) =>
        s.provider_subscription_id &&
        !s.provider_subscription_id.startsWith('trial_sub_'),
    );

    if (!paidSeat) {
      // All trial seats — just mark them cancelled locally
      const seatIds = seats.map((s: { id: string }) => s.id);

      await adminClient
        .from('workspace_module_seats')
        .update({ status: 'cancelled' })
        .in('id', seatIds);

      // Deactivate seat assignments
      await adminClient
        .from('seat_assignments')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .in('seat_id', seatIds)
        .eq('is_active', true);

      return NextResponse.json({
        success: true,
        message: productKey
          ? 'Module trial cancelled.'
          : 'All trial subscriptions cancelled.',
      });
    }

    const subscriptionId = paidSeat.provider_subscription_id;
    const stripe = getStripeClient();

    // ── MODE 1: Module removal (single product) ────────────────
    if (productKey) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const targetSeat = seats[0] as any;

      // Validate: only owner should be using this module
      if (targetSeat.seats_used > 1) {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot remove module: ${targetSeat.seats_used} users are assigned. Remove team members from this module first.`,
          },
          { status: 400 },
        );
      }

      // Get the Stripe subscription to find the line item
      let subscription;
      try {
        subscription = await stripe.subscriptions.retrieve(subscriptionId);
      } catch {
        return NextResponse.json(
          {
            success: false,
            message: 'Could not retrieve subscription from Stripe',
          },
          { status: 500 },
        );
      }

      const meta = targetSeat.provider_metadata ?? {};
      const stripeItemId = meta.stripe_subscription_item_id as
        | string
        | undefined;

      // Find the matching subscription item
      const subItem = stripeItemId
        ? subscription.items.data.find((i) => i.id === stripeItemId)
        : subscription.items.data.length === 1
          ? subscription.items.data[0]
          : null;

      if (!subItem) {
        return NextResponse.json(
          {
            success: false,
            message:
              'Could not find the subscription item for this module. Please contact support.',
          },
          { status: 400 },
        );
      }

      // If this is the only item, cancel the entire subscription
      if (subscription.items.data.length <= 1) {
        try {
          await stripe.subscriptions.cancel(subscriptionId, {
            cancellation_details: {
              comment: `Last module (${productKey}) removed by owner`,
            },
          });
        } catch (err) {
          console.error('Stripe subscription cancel error:', err);
          return NextResponse.json(
            {
              success: false,
              message: 'Failed to cancel subscription in Stripe',
            },
            { status: 500 },
          );
        }

        // Mark all seats as cancelled
        const { data: dbSeats } = await adminClient
          .from('workspace_module_seats')
          .select('id')
          .eq('provider_subscription_id', subscriptionId);

        const allSeatIds = (dbSeats ?? []).map((s: { id: string }) => s.id);
        await adminClient
          .from('workspace_module_seats')
          .update({ status: 'cancelled' })
          .in('id', allSeatIds);

        // Deactivate seat assignments
        await adminClient
          .from('seat_assignments')
          .update({
            is_active: false,
            revoked_at: new Date().toISOString(),
            revoked_by: user.id,
          })
          .in('seat_id', allSeatIds)
          .eq('is_active', true);

        return NextResponse.json({
          success: true,
          message:
            'This was the last module — your entire subscription has been cancelled.',
          fullCancellation: true,
        });
      }

      // Remove just this line item from the subscription
      try {
        await stripe.subscriptions.update(subscriptionId, {
          items: [
            {
              id: subItem.id,
              deleted: true,
            },
          ],
          metadata: {
            ...subscription.metadata,
            removed_module: productKey,
            removed_by: user.id,
          },
        });
      } catch (err) {
        console.error('Stripe subscription item removal error:', err);
        return NextResponse.json(
          {
            success: false,
            message: 'Failed to remove module from subscription in Stripe',
          },
          { status: 500 },
        );
      }

      // Mark this seat as cancelled
      await adminClient
        .from('workspace_module_seats')
        .update({ status: 'cancelled' })
        .eq('id', targetSeat.id);

      // Deactivate seat assignments for this module
      await adminClient
        .from('seat_assignments')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
        })
        .eq('seat_id', targetSeat.id)
        .eq('is_active', true);

      return NextResponse.json({
        success: true,
        message: `${productKey} module removed from your subscription.`,
        fullCancellation: false,
      });
    }

    // ── MODE 2: Full cancellation ───────────────────────────────
    try {
      await stripe.subscriptions.cancel(subscriptionId, {
        cancellation_details: {
          comment: 'Subscription cancelled by workspace owner',
        },
      });
    } catch (err) {
      console.error('Stripe subscription cancel error:', err);
      return NextResponse.json(
        {
          success: false,
          message: 'Failed to cancel subscription in Stripe',
        },
        { status: 500 },
      );
    }

    // Mark all seats as cancelled
    const allSeatIds = seats.map((s: { id: string }) => s.id);
    await adminClient
      .from('workspace_module_seats')
      .update({ status: 'cancelled' })
      .in('id', allSeatIds);

    // Deactivate seat assignments
    await adminClient
      .from('seat_assignments')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .in('seat_id', allSeatIds)
      .eq('is_active', true);

    return NextResponse.json({
      success: true,
      message:
        'Subscription cancelled. Access will end at the close of the current billing period.',
      fullCancellation: true,
    });
  },
);
