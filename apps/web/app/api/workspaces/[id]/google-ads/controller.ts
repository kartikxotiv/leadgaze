import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '~/utils/response-handler';
import {
  handleGetGoogleAdsSettings,
  handleMutateGoogleAdsSettings,
} from '@kit/integration-google-ads';

export const getGoogleAdsSettings = catchAsync(
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
    return handleGetGoogleAdsSettings(workspaceId, supabase);
  },
);

export const mutateGoogleAdsSettings = catchAsync(
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

    // Resolve current user ID for audit fields
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? '';

    return handleMutateGoogleAdsSettings(workspaceId, action, body, userId, supabase);
  },
);
