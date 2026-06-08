import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * GET /api/subscriptions/seat-assignments?workspaceId=xxx&productKey=yyy
 * Returns seat assignments for a workspace, optionally filtered by product.
 */
export const getSeatAssignments = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const adminClient = getSupabaseServerAdminClient() as any;
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const productKey = request.nextUrl.searchParams.get('productKey');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    let query = adminClient
      .from('seat_assignments')
      .select(
        `
      *,
      accounts!seat_assignments_user_id_fkey (
        id,
        email,
        name,
        picture_url
      ),
      subscription_products (
        id,
        product_key,
        display_name
      ),
      workspace_module_seats (
        id,
        seats_purchased,
        seats_used,
        status
      )
    `,
      )
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });

    if (productKey) {
      query = query.eq('subscription_products.product_key', productKey);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Get seat assignments error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    // Deduplicate by user_id — keep only the most recent assignment per user
    const seen = new Set<string>();
    const deduped = (data || []).filter((row: Record<string, unknown>) => {
      const uid = row.user_id as string;
      if (seen.has(uid)) return false;
      seen.add(uid);
      return true;
    });

    return NextResponse.json({ success: true, data: deduped });
  },
);

/**
 * POST /api/subscriptions/seat-assignments
 * Assign a seat to a user for a product.
 * Body: { workspaceId, userId, productKey }
 */
export const createSeatAssignment = catchAsync(
  async ({
    request,
    user,
  }: {
    request: NextRequest;
    user?: { id: string };
  }) => {
    // Cast to any — subscription tables aren't in generated types yet
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
    const { workspaceId, userId, productKey } = body;

    if (!workspaceId || !userId || !productKey) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId, userId, and productKey are required',
        },
        { status: 400 },
      );
    }

    // Resolve product ID from product_key
    const { data: product } = await adminClient
      .from('subscription_products')
      .select('id')
      .eq('product_key', productKey)
      .eq('is_active', true)
      .single();

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: 'Product not found or inactive',
        },
        { status: 404 },
      );
    }

    // Find active workspace_module_seats for this workspace + product
    // Use limit(1) instead of single() to handle duplicate seat rows gracefully
    const { data: seatRows } = await adminClient
      .from('workspace_module_seats')
      .select('id, seats_purchased, seats_used, status')
      .eq('workspace_id', workspaceId)
      .eq('product_id', product.id)
      .in('status', ['active', 'trialing'])
      .limit(1);

    const seat = seatRows?.[0];

    if (!seat) {
      return NextResponse.json(
        {
          success: false,
          message:
            'No active subscription found for this product. Subscribe first.',
        },
        { status: 400 },
      );
    }

    // Check capacity
    if (seat.seats_used >= seat.seats_purchased) {
      return NextResponse.json(
        {
          success: false,
          message: 'Seat capacity exceeded. Purchase more seats first.',
        },
        { status: 400 },
      );
    }

    // Check if user already has an active assignment for this product
    const { data: existing } = await adminClient
      .from('seat_assignments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('product_id', product.id)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message: 'User already has an active seat for this product',
        },
        { status: 400 },
      );
    }

    // If there's an inactive assignment, reactivate it
    const { data: inactiveAssignment } = await adminClient
      .from('seat_assignments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('product_id', product.id)
      .eq('is_active', false)
      .maybeSingle();

    if (inactiveAssignment) {
      const { data, error } = await adminClient
        .from('seat_assignments')
        .update({
          is_active: true,
          assigned_at: new Date().toISOString(),
          assigned_by: user.id,
          revoked_at: null,
          revoked_by: null,
        })
        .eq('id', inactiveAssignment.id)
        .select()
        .single();

      if (error) {
        console.error('Reactivate seat assignment error:', error);
        return NextResponse.json(
          { success: false, message: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, data });
    }

    // Create new assignment
    const { data, error } = await adminClient
      .from('seat_assignments')
      .insert({
        seat_id: seat.id,
        workspace_id: workspaceId,
        user_id: userId,
        product_id: product.id,
        is_active: true,
        assigned_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Create seat assignment error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  },
);

/**
 * DELETE /api/subscriptions/seat-assignments?id=xxx
 * Revoke a seat assignment.
 */
export const deleteSeatAssignment = catchAsync(
  async ({
    request,
    user,
  }: {
    request: NextRequest;
    user?: { id: string };
  }) => {
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

    const assignmentId = request.nextUrl.searchParams.get('id');

    if (!assignmentId) {
      return NextResponse.json(
        {
          success: false,
          message: 'Assignment id is required',
        },
        { status: 400 },
      );
    }

    const { data, error } = await adminClient
      .from('seat_assignments')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) {
      console.error('Delete seat assignment error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  },
);
