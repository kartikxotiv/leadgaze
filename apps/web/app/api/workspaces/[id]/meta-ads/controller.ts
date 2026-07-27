import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '~/utils/response-handler';
import {
  handleGetMetaAdsSettings,
  handleMutateMetaAdsSettings,
} from '@kit/integration-meta-ads';

export const getMetaAdsSettings = catchAsync(
  async ({
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const workspaceId = params?.id;
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'Workspace ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    return handleGetMetaAdsSettings(workspaceId, supabase);
  },
);

export const mutateMetaAdsSettings = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const workspaceId = params?.id;
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'Workspace ID is required' },
        { status: 400 },
      );
    }

    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const action = body.action as string;

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? '';

    return handleMutateMetaAdsSettings(workspaceId, action, body, userId, supabase);
  },
);
