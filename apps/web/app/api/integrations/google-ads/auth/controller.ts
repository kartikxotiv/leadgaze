import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '~/utils/response-handler';
import { buildGoogleAdsOAuthUrl } from '@kit/integration-google-ads';

export const dynamic = 'force-dynamic';

export const googleAdsAuth = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, message: 'Missing workspace_id' },
        { status: 400 },
      );
    }

    // Get the current user ID for the state
    const supabase = getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const state = Buffer.from(
      JSON.stringify({
        workspaceId,
        userId: user?.id ?? '',
        returnUrl: `/home/sales/workspace-settings/integrations/google-ads`,
      }),
    ).toString('base64');

    const url = buildGoogleAdsOAuthUrl(state);
    return NextResponse.redirect(url);
  },
);
