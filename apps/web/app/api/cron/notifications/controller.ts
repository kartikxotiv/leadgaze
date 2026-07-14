/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { EmailScheduler } from '~/lib/cron/email-scheduler';
import { MeetingChecker } from '~/lib/cron/meeting-checker';
import { ReminderChecker } from '~/lib/cron/reminder-checker';

const notificationReminderController = async (_request: NextRequest) => {
  try {
    console.log('[Cron] Starting notification check...');
    const startTime = Date.now();

    // Check reminders, meetings, and outbound email dispatches in parallel
    const [
      reminderCount,
      meetingCount,
      emailCount,
    ] = await Promise.all([
      ReminderChecker.checkAndNotify(),
      MeetingChecker.checkAndNotify(),
      EmailScheduler.checkAndSend(),
    ]);

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      notifications: {
        reminders: reminderCount,
        meetings: meetingCount,
        emails: emailCount,
        total: reminderCount + meetingCount + emailCount,
      },
    };

    console.log('[Cron] Notification check complete:', result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Cron] Error in notification check:', error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Internal server error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
};

export { notificationReminderController };
