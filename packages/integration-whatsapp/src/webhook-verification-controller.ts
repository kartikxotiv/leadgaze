import { NextRequest, NextResponse } from 'next/server';

import { verifyWebhookChallenge } from './whatsapp-provider';

export function handleWhatsAppWebhookVerification(
  request: NextRequest,
): NextResponse {
  const { searchParams } = request.nextUrl;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const { valid, challenge: ch } = verifyWebhookChallenge(
    mode,
    token,
    challenge,
  );

  if (!valid || !ch) {
    return new NextResponse('Forbidden', { status: 403 });
  }

  return new NextResponse(ch, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

// ---------------------------------------------------------------------------
// OAuth Callback (Embedded Signup)
// ---------------------------------------------------------------------------
