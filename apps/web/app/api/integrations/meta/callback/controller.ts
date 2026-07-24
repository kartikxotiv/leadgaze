import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { catchAsync } from '~/utils/response-handler';
import { handleMetaAdsCallback } from '@kit/integration-meta-ads';
import { handleWhatsAppCallback } from '@kit/integration-whatsapp';

export const dynamic = 'force-dynamic';

export const metaAdsCallback = catchAsync(
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

    const fallbackRedirect = '/home/sales/workspace-settings/integrations';

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

    let parsedState: Record<string, string> = {};
    try {
      parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch {
      // invalid state
    }

    const type = parsedState.type ?? 'ads';
    const supabase = getSupabaseServerClient();

    let redirectUrl = fallbackRedirect;

    if (type === 'whatsapp') {
      const result = await handleWhatsAppCallback(code, state, supabase);
      redirectUrl = result.redirectUrl;
    } else {
      const result = await handleMetaAdsCallback(code, state, supabase);
      redirectUrl = result.redirectUrl;
    }

    return NextResponse.redirect(new URL(redirectUrl, request.url));
  },
);
