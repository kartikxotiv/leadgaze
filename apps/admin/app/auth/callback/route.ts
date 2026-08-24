import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { createMiddlewareClient } from '@kit/supabase/middleware-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

/**
 * GET /auth/callback
 *
 * Handles both OAuth code exchange and OTP token hash verification for the admin panel.
 * Uses createMiddlewareClient(request, response) to guarantee Set-Cookie headers
 * for sb-admin-auth-token are written directly to the redirect response.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const nextFromParams = searchParams.get('next');

  const destination = nextFromParams ?? pathsConfig.app.home;
  const targetUrl = new URL(destination, request.nextUrl.origin).href;

  const response = NextResponse.redirect(targetUrl);
  const supabase = createMiddlewareClient(request, response);

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink' | 'signup' | 'recovery' | 'invite',
      token_hash: tokenHash,
    });

    if (error) {
      console.error('[admin/auth/callback] verifyOtp error:', error);
      return NextResponse.redirect(
        new URL(
          `${pathsConfig.auth.signIn}?error=${encodeURIComponent(error.message)}`,
          request.nextUrl.origin,
        ).href,
      );
    }

    return response;
  }

  const service = createAuthCallbackService(getSupabaseServerClient());
  await service.exchangeCodeForSession(request, {
    redirectPath: destination,
  });

  return response;
}
