import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '~/utils/response-handler';
import {
  handleGetWhatsAppSettings,
  handleMutateWhatsAppSettings,
} from '@kit/integration-whatsapp';

export const getWhatsAppSettings = catchAsync(
  async ({
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const workspaceId = params?.id;
    if (!workspaceId) {
      return NextResponse.json({ success: false, message: 'Workspace ID is required' }, { status: 400 });
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
      return NextResponse.json({ success: false, message: 'Workspace ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const body = await request.json();
    const action = body.action as string;

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? '';

    return handleMutateWhatsAppSettings(workspaceId, action, body, userId, supabase);
  },
);
