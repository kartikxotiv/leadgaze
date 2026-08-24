import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { SubscriptionLifecycleJob } from '~/lib/subscriptions/lifecycle-job';

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization');
  if (secret && authorization !== `Bearer ${secret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 },
    );
  }
  if (!secret && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET is not configured' },
      { status: 503 },
    );
  }
  try {
    const startedAt = Date.now();
    const data = await new SubscriptionLifecycleJob().run();
    return NextResponse.json({
      success: true,
      statusCode: 200,
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      data,
    });
  } catch (error) {
    console.error('[SubscriptionLifecycle] cron failed', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Lifecycle job failed',
      },
      { status: 500 },
    );
  }
}
