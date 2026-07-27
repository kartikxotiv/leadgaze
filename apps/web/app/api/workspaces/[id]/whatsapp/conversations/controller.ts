import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '~/utils/response-handler';
import { handleGetConversations } from '@kit/integration-whatsapp';

export const getConversations = catchAsync(
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
    return handleGetConversations(workspaceId, request.nextUrl.searchParams, supabase);
  },
);
