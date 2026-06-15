import nodemailer from 'nodemailer';

import { decrypt } from './crypto';

export async function sendSMTP({
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
  const host = account.smtp_host ?? account.host;
  const port = account.smtp_port ?? account.port;
  const secure = account.smtp_secure ?? account.secure;
  const username = account.smtp_username ?? account.username;
  const encryptedPassword = account.smtp_password ?? account.password;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: username
      ? {
          user: username,
          pass: encryptedPassword ? decrypt(encryptedPassword) : undefined,
        }
      : undefined,
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
