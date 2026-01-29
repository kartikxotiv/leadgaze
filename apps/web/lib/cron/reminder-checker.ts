import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { NotificationService } from './notification-service';
import { REMINDER_CONFIG } from './reminder-config';

/**
 * Service to check for due reminders and send notifications
 * Uses batch processing for better performance
 */
export class ReminderChecker {
  private static readonly BATCH_SIZE = 10;

  /**
   * Check for due reminders and send email notifications
   * Returns the number of notifications sent
   */
  static async checkAndNotify(): Promise<number> {
    const supabase = getSupabaseServerClient();
    let notificationCount = 0;

    try {
      console.log('[ReminderChecker] Starting reminder check...');

      // Calculate the cutoff date for old reminders
      const lookbackDate = new Date();
      lookbackDate.setDate(
        lookbackDate.getDate() - REMINDER_CONFIG.lookbackDays,
      );

      // Find reminders that are overdue and not completed
      const { data: reminders, error } = await supabase
        .from('crm_reminders')
        .select('*')
        .eq('is_deleted', false)
        .eq('is_completed', false)
        .lte('due_date', new Date().toISOString())
        .gte('due_date', lookbackDate.toISOString())
        .order('due_date', { ascending: true });

      if (error) {
        console.error('[ReminderChecker] Error fetching reminders:', error);
        return 0;
      }

      if (!reminders || reminders.length === 0) {
        console.log('[ReminderChecker] No due reminders found');
        return 0;
      }

      console.log(`[ReminderChecker] Found ${reminders.length} due reminders`);

      // Process reminders in batches
      const batches = this.createBatches(reminders, this.BATCH_SIZE);

      for (const batch of batches) {
        const results = await Promise.allSettled(
          batch.map((reminder) => this.processReminder(supabase, reminder)),
        );

        // Count successful notifications
        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            notificationCount++;
          }
        });
      }

      console.log(
        `[ReminderChecker] Sent ${notificationCount} reminder notifications`,
      );
      return notificationCount;
    } catch (error) {
      console.error('[ReminderChecker] Fatal error in checkAndNotify:', error);
      return notificationCount;
    }
  }

  /**
   * Process a single reminder
   */
  private static async processReminder(
    supabase: any,
    reminder: any,
  ): Promise<boolean> {
    try {
      // Determine who to send the notification to: assigned_to takes priority, fallback to created_by
      const recipientUserId = reminder.assigned_to || reminder.created_by;
      if (!recipientUserId) {
        console.log(
          `[ReminderChecker] Skipping reminder ${reminder.id} - no recipient found`,
        );
        return false;
      }

      // Check if we've already sent a notification for this reminder
      const { data: existing } = await supabase
        .from('reminder_notifications_sent')
        .select('id')
        .eq('reminder_id', reminder.id)
        .eq('sent_to', recipientUserId)
        .maybeSingle();

      if (existing) {
        console.log(
          `[ReminderChecker] Notification already sent for reminder ${reminder.id}`,
        );
        return false;
      }

      // Get user email
      const email = await NotificationService.getUserEmail(recipientUserId);
      if (!email) {
        console.error(
          `[ReminderChecker] No email found for user ${recipientUserId}`,
        );
        return false;
      }

      // Send email notification
      const sent = await NotificationService.sendReminderEmail({
        to: email,
        reminderTitle: reminder.title,
        reminderDescription: reminder.description,
        dueDate: reminder.due_date,
        entityType: reminder.entity_type,
        entityId: reminder.entity_id,
      });

      if (sent) {
        // Mark the reminder as completed
        await supabase
          .from('crm_reminders')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('id', reminder.id);

        // Record that we sent the notification (for audit trail)
        await supabase.from('reminder_notifications_sent').insert({
          reminder_id: reminder.id,
          sent_to: recipientUserId,
        });

        console.log(
          `[ReminderChecker] Sent notification for reminder: ${reminder.title}`,
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        `[ReminderChecker] Error processing reminder ${reminder.id}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Split array into batches
   */
  private static createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }
}
