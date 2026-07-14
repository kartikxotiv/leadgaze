import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * GET /api/subscriptions/workspace-status?workspaceId=xxx
 * Returns subscription status summary for a workspace, including enabled modules.
 */
export const getWorkspaceStatus = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const adminClient = getSupabaseServerAdminClient();
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    // Get all active/trialing workspace_module_seats with product info
    const { data: seats, error } = await adminClient
      .from('workspace_module_seats')
      .select(
        `
        id,
        seats_purchased,
        seats_used,
        status,
        billing_cycle,
        current_period_start,
        current_period_end,
        trial_ends_at,
        subscription_products (
          id,
          product_key,
          display_name,
          monthly_price_per_seat,
          yearly_price_per_seat,
          india_monthly_price_per_seat,
          india_yearly_price_per_seat
        )
      `,
      )
      .eq('workspace_id', workspaceId)
      .in('status', ['active', 'trialing']);

    if (error) {
      console.error('Get workspace status error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    // Also check for entitlements
    const { data: entitlements } = await adminClient
      .from('module_entitlements')
      .select(
        `
        id,
        entitlement_type,
        granted_seats,
        valid_from,
        valid_until,
        subscription_products (
          id,
          product_key,
          display_name
        )
      `,
      )
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    const now = new Date();

    // Build enabled_modules list
    const enabledModules: Array<{
      module_id: string;
      module_key: string;
      module_name: string;
      purchased_seats: number;
      used_seats: number;
      subscription_status: string;
    }> = [];

    // Add modules from paid subscriptions
    for (const seat of seats || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const product = seat.subscription_products as any;
      if (!product) continue;

      // Check period validity
      if (seat.current_period_end && new Date(seat.current_period_end) < now) {
        continue; // Expired
      }

      enabledModules.push({
        module_id: product.id,
        module_key: product.product_key,
        module_name: product.display_name,
        purchased_seats: seat.seats_purchased,
        used_seats: seat.seats_used,
        subscription_status: seat.status,
      });
    }

    // Add modules from entitlements (free access)
    for (const ent of entitlements || []) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const product = ent.subscription_products as any;
      if (!product) continue;

      // Check validity period
      if (ent.valid_until && new Date(ent.valid_until) < now) continue;

      // Skip if already added from paid subscription
      if (enabledModules.some((m) => m.module_key === product.product_key))
        continue;

      enabledModules.push({
        module_id: product.id,
        module_key: product.product_key,
        module_name: product.display_name,
        purchased_seats: ent.granted_seats ?? 999,
        used_seats: 0,
        subscription_status: 'active',
      });
    }

    // Determine overall subscription validity
    const hasActiveSeats = (seats || []).some((s) => {
      if (s.current_period_end && new Date(s.current_period_end) < now)
        return false;
      return true;
    });
    const hasValidEntitlements = (entitlements || []).some((e) => {
      if (e.valid_until && new Date(e.valid_until) < now) return false;
      return true;
    });

    const isSubscriptionValid = hasActiveSeats || hasValidEntitlements;

    // Trial info (from first trialing seat)
    const trialingSeat = (seats || []).find((s) => s.status === 'trialing');
    let trialDaysRemaining: number | null = null;
    let isTrialExpired = false;

    if (trialingSeat?.trial_ends_at) {
      const trialEnd = new Date(trialingSeat.trial_ends_at);
      const diffMs = trialEnd.getTime() - now.getTime();
      trialDaysRemaining = Math.max(
        0,
        Math.ceil(diffMs / (1000 * 60 * 60 * 24)),
      );
      isTrialExpired = diffMs <= 0;
    }

    // Primary subscription info
    const primarySeat = (seats || [])[0];
    const subscription = primarySeat
      ? {
          status: primarySeat.status,
          billing_cycle: primarySeat.billing_cycle,
          current_period_end: primarySeat.current_period_end,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        enabled_modules: enabledModules,
        subscription,
        is_subscription_valid: isSubscriptionValid,
        is_trial_expired: isTrialExpired,
        trial_days_remaining: trialDaysRemaining,
      },
    });
  },
);
