import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createAuthCallbackService } from '@kit/supabase/auth';
import { createMiddlewareClient } from '@kit/supabase/middleware-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import pathsConfig from '~/config/paths.config';

/**
 * Determine the best redirect destination after authentication.
 * Priority: invitation > explicit `next` param > workspace check > home.
 */
async function resolvePostAuthRedirect(
  nextPathFromParams: string | null,
): Promise<string> {
  const supabase = getSupabaseServerClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return nextPathFromParams ?? pathsConfig.app.home;
    }

    // 1. Check for pending workspace invitations
    const { data: invitation } = await supabase
      .from('workspace_invitations')
      .select('id, token, email, status, token_expires_at')
      .eq('email', user.email.toLowerCase())
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      invitation &&
      (!invitation.token_expires_at ||
        new Date(invitation.token_expires_at) >= new Date())
    ) {
      return `/invite?token=${invitation.token}`;
    }

    // 2. Check workspace membership
    const { count, error } = await supabase
      .from('workspace_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    if (error) {
      console.error('Workspace membership check error:', error);
      return nextPathFromParams ?? pathsConfig.app.home;
    }

    const hasWorkspace = (count ?? 0) > 0;

    if (!hasWorkspace) {
      return pathsConfig.app.workspaceSetup;
    }

    if (count !== null && count > 1) {
      return '/workspace-select';
    }

    return nextPathFromParams ?? pathsConfig.app.home;
  } catch (error) {
    console.error('Error resolving post-auth redirect:', error);
    return nextPathFromParams ?? pathsConfig.app.home;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const nextFromParams = searchParams.get('next');

  // Handle token_hash verification (Magic Link / OTP / Impersonation)
  if (tokenHash && type) {
    // Determine target URL
    let targetUrl: string;
    if (nextFromParams?.includes('/api/impersonate')) {
      targetUrl = new URL(nextFromParams, request.nextUrl.origin).href;
    } else {
      const destination = await resolvePostAuthRedirect(nextFromParams);
      targetUrl = new URL(destination, request.nextUrl.origin).href;
    }

    // Pass the redirect response directly to createMiddlewareClient so
    // Supabase writes Set-Cookie headers with exact cookie options (httpOnly, sameSite, etc)
    const response = NextResponse.redirect(targetUrl);
    const supabase = createMiddlewareClient(request, response);

    const { error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink' | 'signup' | 'recovery' | 'invite',
      token_hash: tokenHash,
    });

    if (error) {
      console.error('[auth/callback] verifyOtp error:', error);
      return NextResponse.redirect(
        new URL(
          `/auth/sign-in?error=${encodeURIComponent(error.message)}`,
          request.nextUrl.origin,
        ).href,
      );
    }

    return response;
  }

  // Handle OAuth code exchange flow
  const service = createAuthCallbackService(getSupabaseServerClient());
  const { nextPath } = await service.exchangeCodeForSession(request, {
    redirectPath: pathsConfig.app.home,
  });

  const destination = await resolvePostAuthRedirect(
    nextFromParams ?? nextPath,
  );
  return NextResponse.redirect(
    new URL(destination, request.nextUrl.origin).href,
  );
}
