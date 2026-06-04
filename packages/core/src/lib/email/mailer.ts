import { sendGmailOAuth } from './gmail';
import { sendSMTP } from './smtp';

export async function sendMail(options: {
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
  const { account } = options;

  if (!account) {
    throw new Error('Missing email account configuration');
  }

  if (account.provider === 'smtp' || account.provider === 'imap') {
    return sendSMTP(options);
  }

  if (account.provider === 'google') {
    return sendGmailOAuth(options);
  }

  throw new Error(`Unsupported email provider: ${account.provider}`);
}
