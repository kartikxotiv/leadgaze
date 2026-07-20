import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { requireSubscriptionManagePermission } from '~/lib/server/subscription-permissions';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * POST /api/subscriptions/dummy-checkout
 * Simulates a payment checkout. Creates workspace_module_seats + payment_events log.
 *
 * Body: { workspaceId, productKey, seats, billingCycle }
 */
export const dummyCheckout = catchAsync(
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
    const { workspaceId, productKey, seats, billingCycle } = body;

    if (!workspaceId || !productKey || !seats || seats < 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId, productKey, and seats (>= 1) are required',
        },
        { status: 400 },
      );
    }

    const cycle = billingCycle || 'monthly';

    await requireSubscriptionManagePermission({
      accountId: user.id,
      workspaceId,
    });

    // Resolve product
    const { data: product, error: productError } = await adminClient
      .from('subscription_products')
      .select('*')
      .eq('product_key', productKey)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { success: false, message: 'Product not found or inactive' },
        { status: 404 },
      );
    }

    // Check if workspace already has an active subscription for this product
    const { data: existingSeat } = await adminClient
      .from('workspace_module_seats')
      .select('id, status, seats_purchased')
      .eq('workspace_id', workspaceId)
      .eq('product_id', product.id)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (existingSeat) {
      // Update existing subscription seat count instead of creating new
      const { data, error } = await adminClient
        .from('workspace_module_seats')
        .update({
          seats_purchased: existingSeat.seats_purchased + seats,
          updated_by: user.id,
        })
        .eq('id', existingSeat.id)
        .select()
        .single();

      if (error) {
        console.error('Update existing seat error:', error);
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 500 },
        );
      }

      // Log payment event
      await adminClient.from('payment_events').insert({
        workspace_id: workspaceId,
        seat_id: existingSeat.id,
        payment_provider: 'manual',
        provider_event_id: `dummy_add_${Date.now()}_${existingSeat.id}`,
        event_type: 'seat.added',
        payload: {
          product_key: productKey,
          seats_added: seats,
          new_total: existingSeat.seats_purchased + seats,
          billing_cycle: cycle,
        },
        processed_at: new Date().toISOString(),
      });

      // Auto-assign seat to buyer if they don't already have one for this product
      await autoAssignSeatToBuyer(
        adminClient,
        workspaceId,
        user.id,
        product.id,
        existingSeat.id,
      );

      return NextResponse.json({
        success: true,
        data,
        message: `Added ${seats} seat(s) to existing ${product.display_name} subscription`,
      });
    }

    // Calculate period
    const now = new Date();
    const periodEnd = new Date(now.getTime());
    if (cycle === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Create new workspace_module_seats row
    const { data: newSeat, error: seatError } = await adminClient
      .from('workspace_module_seats')
      .insert({
        workspace_id: workspaceId,
        product_id: product.id,
        seats_purchased: seats,
        seats_used: 0,
        status: 'active',
        billing_cycle: cycle,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        payment_provider: 'manual',
        provider_customer_id: `dummy_cus_${workspaceId}`,
        provider_subscription_id: `dummy_sub_${Date.now()}`,
        provider_metadata: { dummy: true, source: 'dummy-checkout' },
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (seatError) {
      console.error('Create workspace_module_seats error:', seatError);
      return NextResponse.json(
        { success: false, message: seatError.message },
        { status: 500 },
      );
    }

    // Log payment event
    const pricePerSeat =
      cycle === 'yearly'
        ? product.yearly_price_per_seat
        : product.monthly_price_per_seat;

    await adminClient.from('payment_events').insert({
      workspace_id: workspaceId,
      seat_id: newSeat.id,
      payment_provider: 'manual',
      provider_event_id: `dummy_checkout_${Date.now()}_${newSeat.id}`,
      event_type: 'checkout.completed',
      payload: {
        product_key: productKey,
        product_name: product.display_name,
        seats,
        billing_cycle: cycle,
        price_per_seat: pricePerSeat,
        total: pricePerSeat ? Number(pricePerSeat) * seats : 0,
        currency: product.currency,
      },
      processed_at: new Date().toISOString(),
    });

    // ── Auto-assign a seat to the buyer ────────────────────────────
    // The person who subscribes should immediately get access.
    await autoAssignSeatToBuyer(
      adminClient,
      workspaceId,
      user.id,
      product.id,
      newSeat.id,
    );

    return NextResponse.json({
      success: true,
      data: newSeat,
      message: `Successfully subscribed to ${product.display_name} with ${seats} seat(s)`,
    });
  },
);

// ─── Helper: Auto-assign seat to the buyer ─────────────────────────

async function autoAssignSeatToBuyer(
  adminClient: ReturnType<typeof getSupabaseServerAdminClient>,
  workspaceId: string,
  userId: string,
  productId: string,
  seatId: string,
) {
  try {
    // Check if buyer already has an active assignment for this product
    const { data: existing } = await adminClient
      .from('seat_assignments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) return; // already assigned

    // Check if there's a previously revoked assignment to reactivate
    const { data: inactive } = await adminClient
      .from('seat_assignments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('is_active', false)
      .maybeSingle();

    if (inactive) {
      await adminClient
        .from('seat_assignments')
        .update({
          is_active: true,
          assigned_at: new Date().toISOString(),
          assigned_by: userId,
          revoked_at: null,
          revoked_by: null,
        })
        .eq('id', inactive.id);
      return;
    }

    // Create new assignment
    await adminClient.from('seat_assignments').insert({
      seat_id: seatId,
      workspace_id: workspaceId,
      user_id: userId,
      product_id: productId,
      is_active: true,
      assigned_by: userId,
    });
  } catch (error) {
    console.error('Auto-assign seat to buyer error:', error);
  }
}
