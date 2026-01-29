import { NextRequest, NextResponse } from 'next/server';

import { MeetingChecker } from '~/lib/cron/meeting-checker';
import { ReminderChecker } from '~/lib/cron/reminder-checker';

const notificationReminderController = async (request: NextRequest) => {
  try {
    // Verify the request is from an authorized cron service
    // const authHeader = request.headers.get('authorization');
    // const cronSecret = process.env.CRON_SECRET;

    // Check if this is from Vercel Cron (they add a special header)
    // const isVercelCron = request.headers.get('x-vercel-cron') != null;

    // Verify authorization
    // if (!isVercelCron) {
    // For non-Vercel environments, check the cron secret
    // if (!cronSecret) {
    //   console.error('[Cron] CRON_SECRET not configured');
    //   return NextResponse.json(
    //     { error: 'Cron secret not configured' },
    //     { status: 500 },
    //   );
    // }

    // const providedSecret = authHeader?.replace('Bearer ', '');
    // if (providedSecret !== cronSecret) {
    //   console.warn('[Cron] Unauthorized cron request');
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    // }

    console.log('[Cron] Starting notification check...');
    const startTime = Date.now();

    // Check reminders and meetings in parallel
    const [reminderCount, meetingCount] = await Promise.all([
      ReminderChecker.checkAndNotify(),
      MeetingChecker.checkAndNotify(),
    ]);

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      notifications: {
        reminders: reminderCount,
        meetings: meetingCount,
        total: reminderCount + meetingCount,
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
