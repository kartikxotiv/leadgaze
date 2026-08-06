import { google } from 'googleapis';
import nodemailer from 'nodemailer';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * Persist refreshed OAuth tokens back to the database so subsequent
 * sends always have a fresh access_token and accurate expires_at.
 */
async function persistOAuthTokens(
  accountId: number,
  tokens: { access_token: string; expires_at: string | null },
): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    await (supabase as any)
      .schema('core')
      .from('email_accounts')
      .update({
        access_token: tokens.access_token,
        expires_at: tokens.expires_at,
      })
      .eq('id', accountId);
  } catch (err) {
    // Token persistence failure should not block sending; log and continue.
    console.error(
      '[sendGmailOAuth] Failed to persist refreshed OAuth tokens:',
      err,
    );
  }
}

export async function sendGmailOAuth({
  account,
  from,
  to,
  cc,
  bcc,
  subject,
  html,
  text,
  headers,
  attachments,
}: {
  account: Record<string, any>;
  from: string;
  to: string;
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  headers?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    path: string;
    contentType?: string;
  }>;
}) {
  if (!account.refresh_token) {
    throw new Error(
      'Missing Google refresh token. Please reconnect your Google account.',
    );
  }

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    throw new Error('Missing Google OAuth environment variables');
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );

  client.setCredentials({
    refresh_token: account.refresh_token,
    access_token: account.access_token ?? undefined,
    expiry_date: account.expires_at
      ? new Date(account.expires_at).getTime()
      : undefined,
  });

  let accessToken: string | null | undefined;
  try {
    const result = await client.getAccessToken();
    accessToken = result.token;
  } catch (err: unknown) {
    const e = err as {
      response?: { data?: { error_description?: string } };
      message?: string;
    };
    const message =
      e?.response?.data?.error_description ?? e?.message ?? 'Unknown error';
    throw new Error(
      `Failed to obtain Google access token: ${message}. Please reconnect your Google account.`,
    );
  }

  if (!accessToken) {
    throw new Error(
      'Google returned no access token. Please reconnect your Google account.',
    );
  }

  // Persist the refreshed token so the DB stays up to date.
  const credentials = client.credentials;
  if (account.id) {
    await persistOAuthTokens(account.id, {
      access_token: accessToken,
      expires_at: credentials.expiry_date
        ? new Date(credentials.expiry_date).toISOString()
        : null,
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: from,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: account.refresh_token,
      accessToken,
    },
  });

  return transporter.sendMail({
    from,
    to,
    cc,
    bcc,
    subject,
    html,
    text,
    headers,
    attachments,
  });
}
