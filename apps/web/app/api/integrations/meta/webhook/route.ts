import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  handleMetaAdsWebhook,
  handleMetaAdsWebhookVerification,
} from '@kit/integration-meta-ads';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createServiceRoleEntitlementService } from '~/lib/entitlements';

export const dynamic = 'force-dynamic';

type MetaAdsWebhookPayload = Parameters<typeof handleMetaAdsWebhook>[0];

/**
 * GET /api/integrations/meta/webhook
 *
 * Meta webhook verification endpoint.
 * Meta sends hub.mode, hub.verify_token, and hub.challenge.
 * We must return the raw hub.challenge value to confirm ownership.
 */
export function GET(request: NextRequest): NextResponse {
  return handleMetaAdsWebhookVerification(request);
}

/**
 * POST /api/integrations/meta/webhook
 *
 * Receives incoming Meta Lead Gen webhook notifications.
 * Always responds 200 immediately to prevent Meta retry storms.
 * Lead data is fetched from the Graph API asynchronously after acknowledging.
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
  return handleMetaAdsWebhook(payload as MetaAdsWebhookPayload, supabase, {
    beforeCreateLead: async (workspaceId) => {
      await entitlements.requireBooleanFeature(
        workspaceId,
        'sales',
        'sales.meta_ads',
      );
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
