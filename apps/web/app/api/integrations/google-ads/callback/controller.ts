import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '~/utils/response-handler';
import { handleGoogleAdsCallback } from '@kit/integration-google-ads';

export const dynamic = 'force-dynamic';

export const googleAdsCallback = catchAsync(
  async ({
    request,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
  }) => {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    const fallbackRedirect = '/home/sales/workspace-settings/integrations/google-ads';

    if (error) {
      return NextResponse.redirect(
        new URL(`${fallbackRedirect}?error=oauth_denied`, request.url),
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`${fallbackRedirect}?error=missing_params`, request.url),
      );
    }

    const supabase = getSupabaseServerClient();
    const { redirectUrl } = await handleGoogleAdsCallback(code, state, supabase);

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  },
);
