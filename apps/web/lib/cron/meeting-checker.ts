/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { NotificationService } from './notification-service';
import { MEETING_REMINDER_INTERVALS } from './reminder-config';

/**
 * Service to check for upcoming meetings and send reminder notifications
 * Supports both:
 *   - Legacy: crm_meetings + meeting_notifications_sent tables
 *   - New: core.meetings + core.meeting_reminders tables
 */
export class MeetingChecker {
  private static readonly BATCH_SIZE = 10;

  /**
   * Auto-complete meetings that have passed
   */
  static async autocompletePassedMeetings(supabase: any): Promise<number> {
    try {
      const now = new Date().toISOString();
      
      // Select candidate meeting IDs first
      const { data: meetingsToComplete, error: selectError } = await supabase
        .schema('core')
        .from('meetings')
        .select('id')
        .in('status', ['scheduled', 'in_progress'])
        .eq('is_deleted', false)
        .or(`scheduled_end.lte.${now},and(scheduled_end.is.null,scheduled_start.lte.${now})`);

      if (selectError) {
        console.error('[MeetingChecker] Error selecting passed meetings:', selectError);
        return 0;
      }

      if (!meetingsToComplete || meetingsToComplete.length === 0) {
        return 0;
      }

      const ids = meetingsToComplete.map((m: any) => m.id);

      // Update their status to completed
      const { data, error } = await supabase
        .schema('core')
        .from('meetings')
        .update({ status: 'completed', updated_at: now })
        .in('id', ids)
        .select('id');

      if (error) {
        console.error('[MeetingChecker] Error autocompleting passed meetings:', error);
        return 0;
      }

      const count = data?.length ?? 0;
      if (count > 0) {
        console.log(`[MeetingChecker] Automatically marked ${count} passed meetings as completed.`);
      }
      return count;
    } catch (error) {
      console.error('[MeetingChecker] Error in autocompletePassedMeetings:', error);
      return 0;
    }
  }

  /**
   * Check for upcoming meetings and send reminder notifications
   * Returns the number of notifications sent
   */
  static async checkAndNotify(): Promise<number> {
    const supabase = getSupabaseServerClient();
    let notificationCount = 0;

    try {
      console.log('[MeetingChecker] Starting meeting check...');

      // Auto-complete passed meetings first
      await MeetingChecker.autocompletePassedMeetings(supabase);

      // Run legacy check and new core reminders check in parallel
      // const [legacyCount, coreRemindersCount] = await Promise.all([
      //   MeetingChecker.checkLegacyMeetings(supabase),
      //   MeetingChecker.checkCoreMeetingReminders(supabase),
      // ]);

      const coreRemindersCount = await MeetingChecker.checkCoreMeetingReminders(supabase);
      notificationCount = coreRemindersCount;

      console.log(
        `[MeetingChecker] Sent ${notificationCount} meeting notifications (legacy: commented out, core: ${coreRemindersCount})`,
      );
      return notificationCount;
    } catch (error) {
      console.error('[MeetingChecker] Fatal error in checkAndNotify:', error);
      return notificationCount;
    }
  }

  // ===========================================================================
  // CORE MEETING REMINDERS (new meetings platform)
  // ===========================================================================

  /**
   * Check core.meeting_reminders for pending reminders and send emails
   * This handles the new meetings platform where reminders are stored with
   * exact scheduled_at timestamps
   */
  private static async checkCoreMeetingReminders(
    supabase: any,
  ): Promise<number> {
    let sent = 0;

    try {
      const now = new Date();

      // Find pending reminders that are due (scheduled_at <= now)
      const { data: reminders, error: remindersError } = await supabase
        .schema('core')
        .from('meeting_reminders')
        .select('*, meeting:meetings(*)')
        .eq('status', 'pending')
        .lte('scheduled_at', now.toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(50);

      if (remindersError) {
        console.error(
          '[MeetingChecker] Error fetching core reminders:',
          remindersError,
        );
        return 0;
      }

      if (!reminders || reminders.length === 0) {
        return 0;
      }

      console.log(
        `[MeetingChecker] Found ${reminders.length} pending core reminders`,
      );

      for (const reminder of reminders) {
        try {
          const meeting = (reminder as any).meeting;
          if (!meeting) {
            // Mark orphaned reminder as failed
            await supabase
              .schema('core')
              .from('meeting_reminders')
              .update({ status: 'failed' })
              .eq('id', reminder.id);
            continue;
          }

          // Skip cancelled meetings
          if (meeting.status === 'cancelled' || meeting.is_deleted) {
            await supabase
              .schema('core')
              .from('meeting_reminders')
              .update({ status: 'cancelled' })
              .eq('id', reminder.id);
            continue;
          }

          // Get meeting participants
          const { data: participants } = await supabase
            .schema('core')
            .from('meeting_participants')
            .select('external_email, internal_user_id, participant_type')
            .eq('meeting_id', meeting.id);

          // Get workspace default timezone
          const { data: pref } = await supabase
            .schema('core')
            .from('workspace_preferences')
            .select('timezone')
            .eq('workspace_id', meeting.workspace_id)
            .maybeSingle();
          const workspaceTz = pref?.timezone || 'UTC';

          // Build list of recipients with their resolved timezones
          const recipientsToNotify: Array<{ email: string; timezone: string }> = [];

          // Add internal participant emails and resolve their timezones from accounts table
          if (participants && participants.length > 0) {
            for (const p of participants) {
              if (p.participant_type === 'INTERNAL' && p.internal_user_id) {
                // Fetch email and timezone from accounts table
                const { data: acc } = await supabase
                  .from('accounts')
                  .select('email, timezone')
                  .eq('id', p.internal_user_id)
                  .maybeSingle();

                const userEmail = acc?.email || await NotificationService.getUserEmail(
                  p.internal_user_id,
                );
                const userTz = acc?.timezone || workspaceTz;

                if (userEmail && !recipientsToNotify.some((r) => r.email === userEmail)) {
                  recipientsToNotify.push({ email: userEmail, timezone: userTz });
                }
              }
            }
          }

          // Also notify the meeting host
          if (meeting.host_user_id) {
            const { data: hostAcc } = await supabase
              .from('accounts')
              .select('email, timezone')
              .eq('id', meeting.host_user_id)
              .maybeSingle();

            const hostEmail = hostAcc?.email || await NotificationService.getUserEmail(
              meeting.host_user_id,
            );
            const hostTz = hostAcc?.timezone || workspaceTz;

            if (hostEmail && !recipientsToNotify.some((r) => r.email === hostEmail)) {
              recipientsToNotify.push({ email: hostEmail, timezone: hostTz });
            }
          }

          // Compute a human-readable interval label
          const offsetMinutes = reminder.offset_minutes;
          let intervalLabel = `${offsetMinutes} minutes before`;
          if (offsetMinutes >= 60) {
            const hours = Math.floor(offsetMinutes / 60);
            intervalLabel =
              hours === 1 ? '1 hour before' : `${hours} hours before`;
          }
          if (offsetMinutes >= 1440) {
            const days = Math.floor(offsetMinutes / 1440);
            intervalLabel = days === 1 ? '1 day before' : `${days} days before`;
          }

          // Send emails to all recipients
          const sendResults = await Promise.allSettled(
            recipientsToNotify.map((recipient) =>
              NotificationService.sendMeetingEmail({
                to: recipient.email,
                meetingTitle: meeting.title,
                meetingDescription: meeting.description,
                startTime: meeting.scheduled_start,
                endTime: meeting.scheduled_end,
                location: meeting.location,
                meetingLink: meeting.meeting_url,
                intervalLabel,
                workspaceId: meeting.workspace_id,
                recipientTz: recipient.timezone,
              }),
            ),
          );

          const allSucceeded = sendResults.every(
            (r) => r.status === 'fulfilled' && r.value === true,
          );

          // Update reminder status
          await supabase
            .schema('core')
            .from('meeting_reminders')
            .update({
              status: allSucceeded ? 'sent' : 'pending',
              sent_at: allSucceeded ? new Date().toISOString() : null,
            })
            .eq('id', reminder.id);

          if (allSucceeded) {
            sent++;
            console.log(
              `[MeetingChecker] Sent core reminder for "${meeting.title}" (${intervalLabel}) to ${recipientsToNotify.length} recipients`,
            );
          }
        } catch (error) {
          console.error(
            `[MeetingChecker] Error processing core reminder ${reminder.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      console.error(
        '[MeetingChecker] Error in checkCoreMeetingReminders:',
        error,
      );
    }

    return sent;
  }

  // ===========================================================================
  // LEGACY MEETING CHECK (crm_meetings table)
  // ===========================================================================

  private static async checkLegacyMeetings(supabase: any): Promise<number> {
    let notificationCount = 0;

    const now = new Date();

    // Process each reminder interval
    for (const interval of MEETING_REMINDER_INTERVALS) {
      try {
        const sent = await MeetingChecker.checkIntervalAndNotify(
          supabase,
          interval.minutes,
          interval.label,
          now,
        );
        notificationCount += sent;
      } catch (error) {
        console.error(
          `[MeetingChecker] Error checking ${interval.minutes}min interval:`,
          error,
        );
      }
    }

    return notificationCount;
  }

  /**
   * Check for meetings at a specific interval and send notifications
   */
  private static async checkIntervalAndNotify(
    supabase: any,
    intervalMinutes: number,
    intervalLabel: string,
    now: Date,
  ): Promise<number> {
    let sent = 0;

    // Calculate the time window for this interval
    const targetTime = new Date(now.getTime() + intervalMinutes * 60 * 1000);

    // Allow a 2-minute window to account for cron job timing
    const windowStart = new Date(targetTime.getTime() - 60 * 1000);
    const windowEnd = new Date(targetTime.getTime() + 60 * 1000);

    console.log(
      `[MeetingChecker] Checking ${intervalMinutes}min interval (${windowStart.toISOString()} to ${windowEnd.toISOString()})`,
    );

    // Find meetings in this time window
    const { data: meetings, error } = await supabase
      .from('crm_meetings')
      .select('*, created_by')
      .eq('is_deleted', false)
      .gte('start_time', windowStart.toISOString())
      .lte('start_time', windowEnd.toISOString());

    if (error) {
      console.error('[MeetingChecker] Error fetching meetings:', error);
      return 0;
    }

    if (!meetings || meetings.length === 0) {
      console.log(
        `[MeetingChecker] No meetings found for ${intervalMinutes}min interval`,
      );
      return 0;
    }

    console.log(
      `[MeetingChecker] Found ${meetings.length} meetings for ${intervalMinutes}min interval`,
    );

    // Process meetings in batches
    const batches = this.createBatches(meetings, this.BATCH_SIZE);

    for (const batch of batches) {
      const results = await Promise.allSettled(
        batch.map((meeting) =>
          this.processMeeting(
            supabase,
            meeting,
            intervalMinutes,
            intervalLabel,
          ),
        ),
      );

      // Count successful notifications
      results.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          sent++;
        }
      });
    }

    return sent;
  }

  /**
   * Process a single meeting
   */
  private static async processMeeting(
    supabase: any,
    meeting: any,
    intervalMinutes: number,
    intervalLabel: string,
  ): Promise<boolean> {
    try {
      // Skip if no user created the meeting
      if (!meeting.created_by) {
        console.log(
          `[MeetingChecker] Skipping meeting ${meeting.id} - no creator assigned`,
        );
        return false;
      }

      // Check if we've already sent a notification for this meeting at this interval
      const { data: existing } = await supabase
        .from('meeting_notifications_sent')
        .select('id')
        .eq('meeting_id', meeting.id)
        .eq('sent_to', meeting.created_by)
        .eq('interval_minutes', intervalMinutes)
        .maybeSingle();

      if (existing) {
        console.log(
          `[MeetingChecker] Notification already sent for meeting ${meeting.id} at ${intervalMinutes}min`,
        );
        return false;
      }

      // Get user email
      const email = await NotificationService.getUserEmail(meeting.created_by);
      if (!email) {
        console.error(
          `[MeetingChecker] No email found for user ${meeting.created_by}`,
        );
        return false;
      }

      // Send email notification
      const emailSent = await NotificationService.sendMeetingEmail({
        to: email,
        meetingTitle: meeting.title,
        meetingDescription: meeting.description,
        startTime: meeting.start_time,
        endTime: meeting.end_time,
        location: meeting.location,
        meetingLink: meeting.meeting_link,
        intervalLabel: intervalLabel,
        workspaceId: meeting.workspace_id,
      });

      if (emailSent) {
        // Record that we sent the notification
        await supabase.from('meeting_notifications_sent').insert({
          meeting_id: meeting.id,
          sent_to: meeting.created_by,
          interval_minutes: intervalMinutes,
        });

        console.log(
          `[MeetingChecker] Sent ${intervalMinutes}min notification for meeting: ${meeting.title}`,
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error(
        `[MeetingChecker] Error processing meeting ${meeting.id}:`,
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
