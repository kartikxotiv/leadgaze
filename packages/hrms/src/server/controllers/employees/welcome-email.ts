import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

import EMPLOYEE_WELCOME_TEMPLATE from '../../../constants/email.templates/employee-welcome.template';
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
  const productName = process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Leadgaze';
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
      productName,
      temporaryPassword: params.temporaryPassword,
      to: params.to,
      workspaceName,
    }),
  });
}

function buildWelcomeEmailHtml(params: {
  employeeName: string;
  loginUrl: string;
  productName: string;
  temporaryPassword: string;
  to: string;
  workspaceName: string;
}) {
  return EMPLOYEE_WELCOME_TEMPLATE(params);
}

export { generateTemporaryPassword, sendEmployeeWelcomeEmail };
