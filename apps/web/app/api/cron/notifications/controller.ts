/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { syncAllCoreEmailAccounts } from '@kit/core';

import { EmailScheduler } from '~/lib/cron/email-scheduler';
import { EmailSyncChecker } from '~/lib/cron/email-sync-checker';
import { MeetingChecker } from '~/lib/cron/meeting-checker';
import { ReminderChecker } from '~/lib/cron/reminder-checker';

const notificationReminderController = async (_request: NextRequest) => {
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

    // Check reminders, meetings, legacy emails, and Core emails in parallel
    const [
      reminderCount,
      meetingCount,
      emailCount,
      syncedCount,
      coreEmailSyncResult,
    ] = await Promise.all([
      ReminderChecker.checkAndNotify(),
      MeetingChecker.checkAndNotify(),
      EmailScheduler.checkAndSend(),
      EmailSyncChecker.syncAll(),
      syncAllCoreEmailAccounts(),
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
        synced: syncedCount,
        coreEmailSynced: coreEmailSyncResult.syncedCount,
        coreEmailAccountsProcessed: coreEmailSyncResult.processedAccounts,
        coreEmailWorkspacesProcessed: coreEmailSyncResult.workspaceCount,
        total:
          reminderCount +
          meetingCount +
          emailCount +
          (syncedCount || 0) +
          coreEmailSyncResult.syncedCount,
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
