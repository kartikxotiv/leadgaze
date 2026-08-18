import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { handleGoogleAdsWebhook } from '@kit/integration-google-ads';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createServiceRoleEntitlementService } from '~/lib/entitlements';

export const dynamic = 'force-dynamic';

type GoogleAdsWebhookPayload = Parameters<typeof handleGoogleAdsWebhook>[0];

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
  const entitlements = createServiceRoleEntitlementService();
  return handleGoogleAdsWebhook(payload as GoogleAdsWebhookPayload, supabase, {
    beforeCreateLead: async (workspaceId) => {
      const reservation = await entitlements.reserveUsage({
        workspaceId,
        moduleKey: 'sales',
        featureKey: 'sales.leads',
        resourceType: 'lead',
      });
      return {
        commit: (resourceId) => reservation.commit({ resourceId }),
        rollback: () => reservation.rollback(),
      };
    },
  });
}

/**
 * GET /api/integrations/google-ads/webhook
 * Google may send a verification GET request during webhook registration.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    success: true,
    message: 'Leadgaze Google Ads Webhook is active.',
  });
}
