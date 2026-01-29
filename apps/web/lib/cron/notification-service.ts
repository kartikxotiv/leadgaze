import { getSupabaseServerClient } from '@kit/supabase/server-client';

import MEETING_REMINDER_TEMPLATE from '~/constants/email.templates/meeting-reminder.template';
import REMINDER_EMAIL_TEMPLATE from '~/constants/email.templates/reminder.template';
import { transporter } from '~/utils/send-mail';

/**
 * Email notification service for reminders and meetings
 * Uses nodemailer to send professional HTML emails
 */

interface ReminderEmailData {
  to: string;
  reminderTitle: string;
  reminderDescription?: string;
  dueDate: string;
  entityType: string;
  entityId: string;
}

interface MeetingEmailData {
  to: string;
  meetingTitle: string;
  meetingDescription?: string;
  startTime: string;
  endTime: string;
  location?: string;
  meetingLink?: string;
  intervalLabel: string;
}

export class NotificationService {
  private static readonly PRODUCT_NAME =
    process.env.NEXT_PUBLIC_PRODUCT_NAME || 'Leadgaze';
  private static readonly FROM_EMAIL =
    process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@leadgaze.com';

  /**
   * Send a reminder notification email
   */
  static async sendReminderEmail(data: ReminderEmailData): Promise<boolean> {
    try {
      console.log('[NotificationService] Sending reminder email:', {
        to: data.to,
        title: data.reminderTitle,
      });

      await transporter.sendMail({
        from: this.FROM_EMAIL,
        to: data.to,
        subject: `Reminder: ${data.reminderTitle} - ${this.PRODUCT_NAME}`,
        html: REMINDER_EMAIL_TEMPLATE({
          reminderTitle: data.reminderTitle,
          reminderDescription: data.reminderDescription,
          dueDate: data.dueDate,
          productName: this.PRODUCT_NAME,
        }),
      });

      console.log('[NotificationService] Reminder email sent successfully');
      return true;
    } catch (error) {
      console.error(
        '[NotificationService] Failed to send reminder email:',
        error,
      );
      return false;
    }
  }

  /**
   * Send a meeting notification email
   */
  static async sendMeetingEmail(data: MeetingEmailData): Promise<boolean> {
    try {
      console.log('[NotificationService] Sending meeting reminder:', {
        to: data.to,
        title: data.meetingTitle,
        interval: data.intervalLabel,
      });

      await transporter.sendMail({
        from: this.FROM_EMAIL,
        to: data.to,
        subject: `Meeting Reminder (${data.intervalLabel}): ${data.meetingTitle} - ${this.PRODUCT_NAME}`,
        html: MEETING_REMINDER_TEMPLATE({
          meetingTitle: data.meetingTitle,
          meetingDescription: data.meetingDescription,
          startTime: data.startTime,
          endTime: data.endTime,
          location: data.location,
          meetingLink: data.meetingLink,
          intervalLabel: data.intervalLabel,
          productName: this.PRODUCT_NAME,
        }),
      });

      console.log('[NotificationService] Meeting email sent successfully');
      return true;
    } catch (error) {
      console.error(
        '[NotificationService] Failed to send meeting email:',
        error,
      );
      return false;
    }
  }

  /**
   * Get user email by user ID
   */
  static async getUserEmail(userId: string): Promise<string | null> {
    try {
      const supabase = getSupabaseServerClient();

      const { data, error } = await supabase
        .from('accounts')
        .select('email')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('[NotificationService] Failed to get user email:', error);
        return null;
      }

      return data.email;
    } catch (error) {
      console.error('[NotificationService] Error fetching user email:', error);
      return null;
    }
  }
}
