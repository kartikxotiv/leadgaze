import { sendGmailOAuth } from './gmail';
import { sendSMTP } from './smtp';

export async function sendMail(options: any) {
  // options should now include 'account' which is the row from email_accounts
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

  throw new Error(`Invalid mail provider: ${account.provider}`);
}
