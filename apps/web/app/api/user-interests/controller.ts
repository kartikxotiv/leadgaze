/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { ApiError, catchAsync } from '../../../utils/response-handler';

/**
 * POST /api/user-interests
 * Records a user's interest in a coming-soon module.
 * Auth is enforced by enhanceRouteHandler (auth: true) so `user` is always
 * present at runtime. The type is `any` to match the RouteHandler signature.
 */
export const recordUserInterest = catchAsync(
  async ({
    request,
    user,
  }: {
    request: NextRequest;
    body?: unknown;
    params?: Record<string, string>;
    user?: any;
  }) => {
    const userId = (user as { id: string } | undefined)?.id;
    if (!userId) throw new ApiError('Unauthorized', 401);

    const body = await request.json();
    const { moduleId } = body as { moduleId?: string };

    if (!moduleId) throw new ApiError('Missing module ID', 400);

    const supabase = getSupabaseServerClient();

    // Note: 'user_module_interests' will show a TS type error until the
    // migration (20260717154504_create_user_module_interests.sql) is applied
    // to the Supabase instance and types are regenerated via:
    //   pnpm supabase gen types typescript --local > apps/web/lib/database.types.ts
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('user_module_interests')
      .insert({
        user_id: userId,
        module_id: moduleId,
        is_interested: true,
      });

    if (error) throw new ApiError('Failed to record interest', 500);

    return NextResponse.json({
      success: true,
      message: 'Interest recorded successfully',
    });
  },
);
