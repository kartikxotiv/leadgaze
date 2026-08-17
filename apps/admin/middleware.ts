import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createMiddlewareClient } from '@kit/supabase/middleware-client';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import pathsConfig from '~/config/paths.config';

export const config = {
  /**
   * Run middleware on all routes except:
   *  - Next.js internals (_next/static, _next/image)
   *  - Static assets (images, locales, favicon)
   *  - API routes (handled by enhanceRouteHandler with auth: true)
   */
  matcher: ['/((?!_next/static|_next/image|images|locales|assets|favicon.ico).*)'],
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  // ── Allow auth routes through without checking ──────────────────────────
  if (pathname.startsWith('/auth')) {
    // If user is already signed in and tries to visit /auth/sign-in,
    // redirect them to the admin home.
    if (pathname === pathsConfig.auth.signIn) {
      const supabase = createMiddlewareClient(request, response);
      const { data } = await supabase.auth.getClaims();

      if (data?.claims) {
        return NextResponse.redirect(
          new URL(pathsConfig.app.home, request.nextUrl.origin),
        );
      }
    }

    return response;
  }

  // ── Allow API routes through (they guard themselves via enhanceRouteHandler) ──
  if (pathname.startsWith('/api')) {
    return response;
  }

  // ── Protected routes: verify session ────────────────────────────────────
  const supabase = createMiddlewareClient(request, response);
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    // Not authenticated — send to sign-in with `next` param so we can
    // restore the original destination after login.
    const signInUrl = new URL(pathsConfig.auth.signIn, request.nextUrl.origin);
    signInUrl.searchParams.set('next', pathname);

    return NextResponse.redirect(signInUrl);
  }

  // ── Verify super-admin status ────────────────────────────────────────────
  // Use the admin client so RLS doesn't block the check.
  const userId = data.claims.sub;
  const adminClient = getSupabaseServerAdminClient();

  const { data: account, error } = await adminClient
    .from('accounts')
    .select('is_super_admin')
    .eq('id', userId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (error || !(account as any)?.is_super_admin) {
    // Authenticated but not a super admin — sign them out and show an error.
    await supabase.auth.signOut();

    const signInUrl = new URL(pathsConfig.auth.signIn, request.nextUrl.origin);
    signInUrl.searchParams.set('error', 'unauthorized');

    return NextResponse.redirect(signInUrl);
  }

  // ── All checks passed ── allow through ──────────────────────────────────
  return response;
}
