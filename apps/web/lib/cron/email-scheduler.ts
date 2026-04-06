import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { sendMail } from '../email/mailer';

/**
 * Service to check for scheduled emails and send them
 */
export class EmailScheduler {
  /**
   * Check for due scheduled emails and send them
   * Returns the number of emails sent
   */
  static async checkAndSend(): Promise<number> {
    const supabase = getSupabaseServerClient();
    let sentCount = 0;

    try {
      console.log('[EmailScheduler] Starting scheduled email check...');

      // 1. Fetch scheduled emails that are due
      const { data: scheduledEmails, error: fetchError } = await supabase
        .from('emails')
        .select('*')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString());

      if (fetchError) {
        console.error('[EmailScheduler] Error fetching scheduled emails:', fetchError);
        return 0;
      }

      if (!scheduledEmails || scheduledEmails.length === 0) {
        console.log('[EmailScheduler] No due scheduled emails found');
        return 0;
      }

      console.log(`[EmailScheduler] Found ${scheduledEmails.length} due scheduled emails`);

      // 2. Fetch all relevant email accounts for these workspaces
      const workspaceIds = [...new Set(scheduledEmails.map((e) => e.workspace_id))];
      const { data: accounts, error: accountsError } = await supabase
        .from('email_accounts')
        .select('*')
        .in('workspace_id', workspaceIds)
        .eq('is_active', true);

      if (accountsError) {
        console.error('[EmailScheduler] Error fetching email accounts:', accountsError);
        return 0;
      }

      const accountMap = new Map(accounts?.map((a) => [a.workspace_id, a]));

      // 3. Process each email
      for (const email of scheduledEmails) {
        try {
          const account = accountMap.get(email.workspace_id);

          if (!account) {
            console.warn(`[EmailScheduler] No active email account found for workspace ${email.workspace_id}, skipping email ${email.id}`);
            continue;
          }

          const info = await sendMail({
            account,
            from: email.from_email || account.email,
            to: email.to_emails,
            cc: email.cc_emails,
            bcc: email.bcc_emails,
            subject: email.subject,
            html: email.html_body,
          });

          // Update status to sent
          await supabase
            .from('emails')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
              gmail_message_id: info?.messageId || null,
            } as any)
            .eq('id', email.id);

          sentCount++;
          console.log(`[EmailScheduler] Successfully sent scheduled email: ${email.id}`);
        } catch (err: any) {
          console.error(`[EmailScheduler] Failed to send scheduled email ${email.id}:`, err);

          // Update status to failed
          await supabase
            .from('emails')
            .update({
              status: 'failed',
            } as any)
            .eq('id', email.id);
        }
      }

      console.log(`[EmailScheduler] Processed ${scheduledEmails.length} emails, sent ${sentCount}`);
      return sentCount;
    } catch (error) {
      console.error('[EmailScheduler] Fatal error in checkAndSend:', error);
      return sentCount;
    }
  }
}
