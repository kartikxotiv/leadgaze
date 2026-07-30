import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '~/utils/response-handler';
import { handleGetMessages } from '@kit/integration-whatsapp';

export const getMessages = catchAsync(
  async ({
    request,
    params,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const workspaceId = params?.id;
    const conversationId = params?.conversationId;

    if (!workspaceId || !conversationId) {
      return NextResponse.json({ success: false, message: 'Workspace ID and conversation ID are required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    return handleGetMessages(workspaceId, conversationId, request.nextUrl.searchParams, supabase);
  },
);
