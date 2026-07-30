import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '~/utils/response-handler';
import {
  handleGetZapierSettings,
  handleToggleZapierStatus,
  handleGenerateZapierKey,
  handleRevokeZapierKey,
} from '@kit/integration-zapier';

export const getZapierSettings = catchAsync(
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
    return handleGetZapierSettings(workspaceId, supabase);
  }
);

export const mutateZapierSettings = catchAsync(
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
    const action = body.action;

    if (action === 'toggle-status') {
      return handleToggleZapierStatus(workspaceId, !!body.checked, supabase);
    }

    if (action === 'generate-key') {
      return handleGenerateZapierKey(workspaceId, supabase);
    }

    if (action === 'revoke-key') {
      return handleRevokeZapierKey(workspaceId, supabase);
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  }
);
