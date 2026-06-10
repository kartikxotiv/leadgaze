import { Buffer } from 'node:buffer';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

import { getWorkspaceMemberContext } from '../../../lib/email/account-access';
import { catchAsync } from '../../../utils/response-handler';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

export const coreGoogleCallbackController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const fallbackUrl = new URL('/home/core/email-settings?error=oauth_error', request.url);

  if (error) {
    return NextResponse.redirect(fallbackUrl);
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/home/core/email-settings?error=missing_params', request.url));
  }

  let decodedState: {
    workspaceId: string;
    returnUrl: string;
    fromName?: string;
    accessScope?: string;
  };

  try {
    decodedState = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
  } catch {
    return NextResponse.redirect(new URL('/home/core/email-settings?error=invalid_state', request.url));
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}${url.pathname}`;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl,
  );

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ auth: oauth2Client, version: 'v2' });
  const { data: userInfo } = await oauth2.userinfo.get();

  if (!userInfo.email) {
    return NextResponse.redirect(new URL('/home/core/email-settings?error=auth_failed', request.url));
  }

  const supabase = getSupabaseServerClient();
  const memberContext = await getWorkspaceMemberContext(supabase, decodedState.workspaceId);

  if (!memberContext) {
    return NextResponse.redirect(new URL('/home/core/email-settings?error=auth_failed', request.url));
  }

  const accessScope =
    memberContext.isAdmin && decodedState.accessScope === 'workspace'
      ? 'workspace'
      : 'private';

  const { error: dbError } = await (supabase as any).schema('core').from('email_accounts').upsert(
    {
      workspace_id: decodedState.workspaceId,
      email: userInfo.email,
      from_name: decodedState.fromName,
      provider: 'google',
      provider_account_id: userInfo.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      is_active: true,
      is_sync_enabled: true,
      inbound_enabled: true,
      outbound_enabled: true,
      owner_user_id: memberContext.userId,
      access_scope: accessScope,
      created_by: memberContext.userId,
      updated_by: memberContext.userId,
    },
    { onConflict: 'workspace_id,email' },
  );

  if (dbError) {
    return NextResponse.redirect(new URL('/home/core/email-settings?error=db_error', request.url));
  }

  return NextResponse.redirect(new URL(decodedState.returnUrl || '/home/core/email-settings', request.url));
});
