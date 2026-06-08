import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { catchAsync } from '../../../../utils/response-handler';

/**
 * GET /api/subscriptions/check-access?workspaceId=xxx&productKey=yyy
 * Checks if the current user has access to the given product in the workspace.
 * Uses the user_has_product_access DB function.
 */
export const checkAccess = catchAsync(
  async ({ request }: { request: NextRequest }) => {
    const supabase = getSupabaseServerClient();
    const adminClient = getSupabaseServerAdminClient();
    const workspaceId = request.nextUrl.searchParams.get('workspaceId');
    const productKey = request.nextUrl.searchParams.get('productKey');

    if (!workspaceId || !productKey) {
      return NextResponse.json(
        {
          success: false,
          message: 'workspaceId and productKey are required',
        },
        { status: 400 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Call the DB function
    const { data, error } = await adminClient.rpc('user_has_product_access', {
      p_user_id: user.id,
      p_workspace_id: workspaceId,
      p_product_key: productKey,
    });

    if (error) {
      console.error('Check access error:', error);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { hasAccess: data === true },
    });
  },
);
