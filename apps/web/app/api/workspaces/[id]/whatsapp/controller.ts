import { NextRequest, NextResponse } from 'next/server';

import {
  handleGetWhatsAppSettings,
  handleMutateWhatsAppSettings,
} from '@kit/integration-whatsapp';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createEntitlementService } from '~/lib/entitlements';
import { catchAsync } from '~/utils/response-handler';

export const getWhatsAppSettings = catchAsync(
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
    return handleGetWhatsAppSettings(workspaceId, supabase);
  },
);

export const mutateWhatsAppSettings = catchAsync(
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id ?? '';

    if (action === 'convert-to-lead') {
      const entitlements = createEntitlementService();
      const reservation = await entitlements.reserveUsage({
        workspaceId,
        moduleKey: 'sales',
        featureKey: 'sales.leads',
        resourceType: 'lead',
      });
      const response = await handleMutateWhatsAppSettings(
        workspaceId,
        action,
        body,
        userId,
        supabase,
      );
      const responseBody = await response
        .clone()
        .json()
        .catch(() => null);
      if (!response.ok || responseBody?.success === false) {
        await reservation.rollback();
      } else {
        await reservation.commit({
          resourceId:
            responseBody?.data?.lead_id ?? responseBody?.data?.id ?? null,
        });
      }
      return response;
    }

    return handleMutateWhatsAppSettings(
      workspaceId,
      action,
      body,
      userId,
      supabase,
    );
  },
);
