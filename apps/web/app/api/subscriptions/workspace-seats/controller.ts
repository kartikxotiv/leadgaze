import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * GET /api/subscriptions/workspace-seats?workspaceId=xxx
 * Returns all workspace_module_seats with product info.
 */
export const getWorkspaceSeats = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const adminClient = getSupabaseServerAdminClient();
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data, error } = await adminClient
      .from('workspace_module_seats')
      .select(
        `
      *,
      subscription_products (
        id,
        product_key,
        display_name,
        monthly_price_per_seat,
        yearly_price_per_seat,
        currency
      )
    `,
      )
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get workspace seats error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  },
);

/**
 * PUT /api/subscriptions/workspace-seats
 * Update seat count for an existing subscription.
 * Body: { seatId, seatsPurchased }
 *
 * NOTE: This is the direct DB update endpoint.
 * For Stripe-managed subscriptions, prefer POST /api/subscriptions/update-seats
 * which handles proration via Stripe. This endpoint serves as a fallback
 * for manual/non-Stripe subscriptions.
 */
export const updateWorkspaceSeats = catchAsync(
  async ({
    request,
    user,
  }: {
    request: NextRequest;
    user?: { id: string };
  }) => {
    const adminClient = getSupabaseServerAdminClient();
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
    const { seatId, seatsPurchased } = body;

    if (!seatId || seatsPurchased == null || seatsPurchased < 1) {
      return NextResponse.json(
        {
          success: false,
          message: 'seatId and seatsPurchased (>= 1) are required',
        },
        { status: 400 },
      );
    }

    // Verify the seat belongs to the user's workspace
    const { data: seat } = await adminClient
      .from('workspace_module_seats')
      .select('id, workspace_id, seats_used, workspaces!inner(owner_id)')
      .eq('id', seatId)
      .single();

    if (!seat) {
      return NextResponse.json(
        { success: false, message: 'Seat subscription not found' },
        { status: 404 },
      );
    }

    // Only workspace owner can modify seats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workspace = seat.workspaces as any;
    if (workspace?.owner_id !== user.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Only the workspace owner can modify seat counts',
        },
        { status: 403 },
      );
    }

    // Cannot reduce below used seats
    if (seatsPurchased < seat.seats_used) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot reduce seats below ${seat.seats_used} (currently in use)`,
        },
        { status: 400 },
      );
    }

    const { data, error } = await adminClient
      .from('workspace_module_seats')
      .update({
        seats_purchased: seatsPurchased,
        updated_by: user.id,
      })
      .eq('id', seatId)
      .select()
      .single();

    if (error) {
      console.error('Update workspace seats error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  },
);
