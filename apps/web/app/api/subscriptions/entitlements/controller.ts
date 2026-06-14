import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * GET /api/subscriptions/entitlements?workspaceId=xxx
 * Returns active entitlements for a workspace (free access grants).
 */
export const getEntitlements = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = getSupabaseServerAdminClient() as any;
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'workspaceId is required' },
        { status: 400 },
      );
    }

    const { data: entitlements, error } = await adminClient
      .from('module_entitlements')
      .select(
        `
        id,
        product_id,
        entitlement_type,
        granted_seats,
        valid_from,
        valid_until,
        is_active,
        reason
      `,
      )
      .eq('workspace_id', workspaceId)
      .eq('is_active', true);

    if (error) {
      console.error('Get entitlements error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    // Filter out expired entitlements
    const now = new Date();
    const activeEntitlements = (entitlements ?? []).filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any) => !e.valid_until || new Date(e.valid_until) > now,
    );

    return NextResponse.json({
      success: true,
      data: activeEntitlements,
    });
  },
);
