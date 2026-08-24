import { NextRequest, NextResponse } from 'next/server';

import Stripe from 'stripe';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  getStripeClient,
  getStripeWebhookSecret,
} from '~/lib/stripe/stripe-client';

import { handleCheckoutCompleted } from './checkout-handlers';
import {
  handleCompatibleInvoice,
  handleCompatibleSubscriptionDeleted,
  handleCompatibleSubscriptionUpdated,
  handlePricingCheckoutCompleted,
} from './compatible-handlers';

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = getSupabaseServerAdminClient() as any;
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  // ── Read raw body for signature verification ──────────────────
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 },
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // ── Idempotency: check if event already processed ─────────────
  const claim = await adminClient.from('payment_events').insert({
    workspace_id: null,
    seat_id: null,
    payment_provider: 'stripe',
    provider_event_id: event.id,
    event_type: event.type,
    payload: event.data.object,
    processed_at: null,
  });

  if (claim.error) {
    if (claim.error.code !== '23505') throw claim.error;
    // Already processed — return 200 so Stripe doesn't retry
    return NextResponse.json({ received: true, duplicate: true });
  }

  // ── Route event to handler ────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        if (
          (event.data.object as Stripe.Checkout.Session).metadata
            ?.pricing_model === 'v1'
        ) {
          await handlePricingCheckoutCompleted(event, adminClient, stripe);
        } else {
          await handleCheckoutCompleted(event, adminClient, stripe);
        }
        break;

      case 'customer.subscription.updated':
        await handleCompatibleSubscriptionUpdated(event, adminClient);
        break;

      case 'customer.subscription.deleted':
        await handleCompatibleSubscriptionDeleted(event, adminClient);
        break;

      case 'invoice.payment_succeeded':
        await handleCompatibleInvoice(event, adminClient, true);
        break;

      case 'invoice.payment_failed':
        await handleCompatibleInvoice(event, adminClient, false);
        break;

      default:
        break;
    }
    await adminClient
      .from('payment_events')
      .update({
        processed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq('payment_provider', 'stripe')
      .eq('provider_event_id', event.id);
  } catch (err) {
    console.error(`Stripe webhook error for event ${event.type}:`, err);

    await adminClient
      .from('payment_events')
      .delete()
      .eq('payment_provider', 'stripe')
      .eq('provider_event_id', event.id)
      .is('processed_at', null);

    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
