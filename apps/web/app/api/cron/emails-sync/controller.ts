/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

import { syncAllCoreEmailAccounts } from '@kit/core';

const emailsSyncController = async (_request: NextRequest) => {
  try {
    console.log('[Cron] Starting email accounts sync...');
    const startTime = Date.now();

    const coreEmailSyncResult = await syncAllCoreEmailAccounts();

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      sync: {
        coreEmailSynced: coreEmailSyncResult.syncedCount,
        coreEmailAccountsProcessed: coreEmailSyncResult.processedAccounts,
        coreEmailWorkspacesProcessed: coreEmailSyncResult.workspaceCount,
      },
    };

    console.log('[Cron] Email accounts sync complete:', result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Cron] Error in email accounts sync:', error);

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

export { emailsSyncController };
