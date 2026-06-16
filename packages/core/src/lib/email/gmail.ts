import { google } from 'googleapis';
import nodemailer from 'nodemailer';

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
}) {
  if (!account.refresh_token) {
    throw new Error('Missing Google refresh token');
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
  });

  const { token } = await client.getAccessToken();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: from,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: account.refresh_token,
      accessToken: token ?? undefined,
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
  });
}
