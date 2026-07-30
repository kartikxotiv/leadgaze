import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { handleGoogleAdsWebhook } from '@kit/integration-google-ads';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/integrations/google-ads/webhook
 *
 * Receives incoming Google Lead Form webhook notifications.
 * Google sends only identifiers — the actual lead data is fetched via Google Ads API.
 * Always responds 200 quickly to prevent Google retry storms.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let payload: Record<string, unknown> = {};

  try {
    payload = await request.json();
  } catch {
    // Malformed JSON — still return 200 to prevent retries
    return NextResponse.json({ success: false, message: 'Invalid JSON body' });
  }

  const supabase = getSupabaseServerClient();
  return handleGoogleAdsWebhook(payload as any, supabase);
}

/**
 * GET /api/integrations/google-ads/webhook
 * Google may send a verification GET request during webhook registration.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ success: true, message: 'Leadgaze Google Ads Webhook is active.' });
}
