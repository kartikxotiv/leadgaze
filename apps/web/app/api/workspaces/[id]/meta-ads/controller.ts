import { NextRequest, NextResponse } from 'next/server';

import {
  handleGetMetaAdsSettings,
  handleMutateMetaAdsSettings,
} from '@kit/integration-meta-ads';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createEntitlementService } from '~/lib/entitlements';
import { catchAsync } from '~/utils/response-handler';

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

    await createEntitlementService().requireBooleanFeature(
      workspaceId,
      'sales',
      'sales.meta_ads',
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? '';

    return handleMutateMetaAdsSettings(
      workspaceId,
      action,
      body,
      userId,
      supabase,
    );
  },
);
