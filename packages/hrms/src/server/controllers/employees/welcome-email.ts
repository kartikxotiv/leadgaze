import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

import type { EmployeeBody } from './utils';

type WelcomeEmailParams = {
  employeeBody: EmployeeBody;
  loginUrl: string;
  temporaryPassword: string;
  to: string;
  workspaceName?: string | null;
};

function generateTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const suffix = Array.from({ length: 10 }, () => {
    return alphabet[crypto.randomInt(0, alphabet.length)];
  }).join('');

  return `Lg${suffix}9!`;
}

async function sendEmployeeWelcomeEmail(params: WelcomeEmailParams) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
  });

  const workspaceName = params.workspaceName?.trim() || 'Leadgaze';
  const employeeName =
    [
      params.employeeBody.first_name?.trim(),
      params.employeeBody.last_name?.trim(),
    ]
      .filter(Boolean)
      .join(' ') || 'there';

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: params.to,
    subject: `Welcome to ${workspaceName}`,
    text: [
      `Hi ${employeeName},`,
      '',
      `Your ${workspaceName} employee account has been created.`,
      '',
      `Login URL: ${params.loginUrl}`,
      `Email: ${params.to}`,
      `Password: ${params.temporaryPassword}`,
      '',
      'Please sign in and change your password after your first login.',
    ].join('\n'),
    html: buildWelcomeEmailHtml({
      employeeName,
      loginUrl: params.loginUrl,
      temporaryPassword: params.temporaryPassword,
      to: params.to,
      workspaceName,
    }),
  });
}

function buildWelcomeEmailHtml(params: {
  employeeName: string;
  loginUrl: string;
  temporaryPassword: string;
  to: string;
  workspaceName: string;
}) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
      <p>Hi ${escapeHtml(params.employeeName)},</p>
      <p>Your ${escapeHtml(params.workspaceName)} employee account has been created.</p>
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>Login URL:</strong> <a href="${escapeHtml(params.loginUrl)}">${escapeHtml(params.loginUrl)}</a></p>
        <p style="margin: 0 0 8px;"><strong>Email:</strong> ${escapeHtml(params.to)}</p>
        <p style="margin: 0;"><strong>Temporary password:</strong> ${escapeHtml(params.temporaryPassword)}</p>
      </div>
      <p>Please sign in and change your password after your first login.</p>
    </div>
  `;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export { generateTemporaryPassword, sendEmployeeWelcomeEmail };
