import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

const IMPERSONATION_COOKIE = 'lg_impersonation';
const SESSION_DURATION_MINUTES = 30;

/**
 * GET /api/impersonate
 *
 * Called AFTER the web portal's /auth/callback has already exchanged the
 * token_hash for a real Supabase session. At this point the user is
 * authenticated as the target user. This endpoint simply:
 *   1. Sets the lg_impersonation cookie with the DB session_id (for the banner)
 *   2. Redirects to /home/sales
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.redirect(new URL('/home/sales', origin).href);
  }

  const response = NextResponse.redirect(new URL('/home/sales', origin).href);

  // Set the impersonation tracking cookie so the banner appears
  response.cookies.set(IMPERSONATION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MINUTES * 60,
  });

  return response;
}

/**
 * DELETE /api/impersonate
 *
 * Ends the active impersonation session from the web portal:
 *   1. Reads lg_impersonation cookie
 *   2. Marks session as completed in DB
 *   3. Clears lg_impersonation cookie
 *   4. Signs out web session for impersonated user
 */
export async function DELETE(request: NextRequest) {
  const sessionId = request.cookies.get(IMPERSONATION_COOKIE)?.value;

  if (sessionId) {
    try {
      const adminClient = getSupabaseServerAdminClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient as any)
        .schema('admin')
        .from('impersonation_sessions')
        .update({
          status: 'completed',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);
    } catch (err) {
      console.error('Failed to update impersonation session status:', err);
    }
  }

  // Sign out the impersonated user session in web portal (local scope only)
  try {
    const supabase = getSupabaseServerClient();
    await supabase.auth.signOut({ scope: 'local' });
  } catch (err) {
    console.error('Error signing out impersonated user session:', err);
  }

  const response = NextResponse.json({ success: true });

  // Clear lg_impersonation cookie
  response.cookies.set(IMPERSONATION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}
