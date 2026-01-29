import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { NotificationService } from './notification-service';
import { MEETING_REMINDER_INTERVALS } from './reminder-config';

/**
 * Service to check for upcoming meetings and send reminder notifications
 * Uses batch processing for better performance
 */
export class MeetingChecker {
  private static readonly BATCH_SIZE = 10;

  /**
   * Check for upcoming meetings and send reminder notifications
   * Returns the number of notifications sent
   */
  static async checkAndNotify(): Promise<number> {
    const supabase = getSupabaseServerClient();
    let notificationCount = 0;

    try {
      console.log('[MeetingChecker] Starting meeting check...');

      const now = new Date();

      // Process each reminder interval
      for (const interval of MEETING_REMINDER_INTERVALS) {
        try {
          const sent = await this.checkIntervalAndNotify(
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

      console.log(
        `[MeetingChecker] Sent ${notificationCount} meeting notifications`,
      );
      return notificationCount;
    } catch (error) {
      console.error('[MeetingChecker] Fatal error in checkAndNotify:', error);
      return notificationCount;
    }
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
