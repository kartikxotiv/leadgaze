import { NextRequest, NextResponse } from 'next/server';
import {
  handleWhatsAppWebhookVerification,
  handleWhatsAppWebhook,
} from '@kit/integration-whatsapp';
import type { WhatsAppWebhookPayload } from '@kit/integration-whatsapp';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

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
  return handleWhatsAppWebhook(rawBody, signature, payload, supabase);
}
