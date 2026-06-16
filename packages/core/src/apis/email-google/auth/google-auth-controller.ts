import { Buffer } from 'node:buffer';

import { google } from 'googleapis';
import { NextResponse } from 'next/server';

import { catchAsync } from '../../../utils/response-handler';

export const coreGoogleAuthController = catchAsync(async ({ request }) => {
  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspace_id') ?? url.searchParams.get('workspaceId');
  const returnUrl = url.searchParams.get('return_url') ?? url.searchParams.get('returnUrl');
  const fromName = url.searchParams.get('from_name') ?? url.searchParams.get('fromName');
  const accessScope = url.searchParams.get('access_scope') ?? url.searchParams.get('accessScope');

  if (!workspaceId) {
    return NextResponse.json({ success: false, message: 'workspace_id is required' }, { status: 400 });
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/api/core/email-google/callback`;
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl,
  );

  const state = Buffer.from(
    JSON.stringify({
      workspaceId,
      fromName,
      accessScope,
      returnUrl: returnUrl || '/home/core/email-settings',
    }),
  ).toString('base64');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    state,
  });

  return NextResponse.redirect(authUrl);
});
