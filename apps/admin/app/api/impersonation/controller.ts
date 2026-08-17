import { NextRequest, NextResponse } from 'next/server';

import { JwtPayload } from '@supabase/supabase-js';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { Database } from '@kit/supabase/database';

import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';

const IMPERSONATION_COOKIE = 'lg_impersonation';
const SESSION_DURATION_MINUTES = 30;

/**
 * POST /api/impersonation
 *
 * Starts an impersonation session. Uses admin.generateLink({ type: 'magiclink' })
 * to generate a one-time token_hash for the target user, then returns it so the
 * admin portal can redirect through the web portal's /auth/callback to establish
 * a real Supabase session without ever requiring the target user's password.
 */
export const startImpersonation = catchAsync(
  async ({
    request,
    user,
  }: {
    request: NextRequest;
    user?: JwtPayload;
  }) => {
    const adminUserId = user?.id || (user as any)?.sub;
    if (!adminUserId) {
      throw new ApiError('Unauthorized', 401);
    }

    const bodyData = await request.clone().json().catch(() => ({})) as {
      target_user_id?: string;
      workspace_id?: string;
      reason?: string;
    };

    const { target_user_id, workspace_id, reason } = bodyData;

    if (!target_user_id || !reason?.trim()) {
      throw new ApiError('target_user_id and reason are required', 400);
    }

    // Prevent admins from impersonating themselves
    if (target_user_id === adminUserId) {
      throw new ApiError('Cannot impersonate yourself', 400);
    }

    const adminClient = getSupabaseServerAdminClient<Database>();

    // Resolve workspace_id: if not provided or zero-UUID, query target_user's primary workspace
    let resolvedWorkspaceId: string | null =
      workspace_id && workspace_id !== '00000000-0000-0000-0000-000000000000'
        ? workspace_id
        : null;

    if (!resolvedWorkspaceId) {
      const { data: membership } = await adminClient
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', target_user_id)
        .limit(1)
        .maybeSingle();

      if (membership?.workspace_id) {
        resolvedWorkspaceId = membership.workspace_id;
      }
    }

    // Fetch the target user's email (needed for generateLink)
    const { data: targetUserData, error: targetUserError } =
      await adminClient.auth.admin.getUserById(target_user_id);

    if (targetUserError || !targetUserData?.user?.email) {
      console.error('Failed to fetch target user:', targetUserError);
      throw new ApiError('Target user not found or has no email', 404);
    }

    const targetEmail = targetUserData.user.email;

    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_MINUTES * 60 * 1000,
    ).toISOString();

    // Insert into admin.impersonation_sessions via schema switching.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session, error } = await (adminClient as any)
      .schema('admin')
      .from('impersonation_sessions')
      .insert({
        admin_user_id: adminUserId,
        target_user_id,
        workspace_id: resolvedWorkspaceId,
        reason: reason.trim(),
        ip_address:
          request.headers.get('x-forwarded-for') ??
          request.headers.get('x-real-ip') ??
          null,
        user_agent: request.headers.get('user-agent') ?? null,
        expires_at: expiresAt,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      console.error('Impersonation insert error:', error);
      throw new ApiError('Failed to create impersonation session', 500);
    }

    const sessionRow = session as { id: string };

    // Generate a magic-link token for the target user using the admin API.
    // This is the supported mechanism in Supabase v2 to create a one-time session
    // token without the user's password. The resulting token_hash is sent to the
    // web portal's /auth/callback?token_hash=...&type=magiclink which exchanges
    // it for a real Supabase JWT.
    const webOrigin =
      process.env.NEXT_PUBLIC_WEB_APP_URL || 'http://localhost:3000';

    const { data: linkData, error: linkError } =
      await adminClient.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
        options: {
          redirectTo: `${webOrigin}/home/sales`,
        },
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Failed to generate impersonation link:', linkError);
      throw new ApiError('Failed to generate impersonation link', 500);
    }

    return successDataResponse({
      session_id: sessionRow.id,
      expires_at: expiresAt,
      // The hashed_token is a one-time-use OTP; web portal's /auth/callback will
      // call verifyTokenHash() and exchange it for a real session.
      token_hash: linkData.properties.hashed_token,
    }) as NextResponse;
  },
);

/**
 * PATCH /api/impersonation/:id
 * End an impersonation session (status: completed | terminated).
 */
export const endImpersonation = catchAsync(
  async ({
    request,
    params,
    user,
  }: {
    request: NextRequest;
    params?: Record<string, string>;
    user?: JwtPayload;
  }) => {
    const adminUserId = user?.id || (user as any)?.sub;
    if (!adminUserId) {
      throw new ApiError('Unauthorized', 401);
    }

    const sessionId = params?.id;
    if (!sessionId) {
      throw new ApiError('Session id is required', 400);
    }

    const bodyData = await request.json().catch(() => ({})) as {
      action?: 'completed' | 'terminated';
    };
    const newStatus = bodyData.action === 'terminated' ? 'terminated' : 'completed';

    const adminClient = getSupabaseServerAdminClient<Database>();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminClient as any)
      .schema('admin')
      .from('impersonation_sessions')
      .update({
        status: newStatus,
        ended_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('admin_user_id', adminUserId);

    if (error) {
      console.error('Impersonation end error:', error);
      throw new ApiError('Failed to end impersonation session', 500);
    }

    const response = successDataResponse({
      session_id: sessionId,
      status: newStatus,
    }) as NextResponse;

    // Clear the impersonation cookie
    response.cookies.set(IMPERSONATION_COOKIE, '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  },
);
