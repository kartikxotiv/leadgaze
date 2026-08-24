import { NextRequest, NextResponse } from 'next/server';

import {
  handleWhatsAppWebhook,
  handleWhatsAppWebhookVerification,
} from '@kit/integration-whatsapp';
import type { WhatsAppWebhookPayload } from '@kit/integration-whatsapp';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { createServiceRoleEntitlementService } from '~/lib/entitlements';

export const dynamic = 'force-dynamic';

/**
 * GET /api/integrations/whatsapp/webhook
 * Meta webhook verification — must respond with raw hub.challenge string.
 */
export function GET(request: NextRequest): NextResponse {
  return handleWhatsAppWebhookVerification(request);
}

/**
 * POST /api/integrations/whatsapp/webhook
 * Receives incoming message/status events. Always returns 200.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    // Malformed JSON — return 200 to prevent Meta retries
    return NextResponse.json({ ok: true });
  }

  const supabase = getSupabaseServerAdminClient();
  const entitlements = createServiceRoleEntitlementService();
  return handleWhatsAppWebhook(rawBody, signature, payload, supabase, {
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
