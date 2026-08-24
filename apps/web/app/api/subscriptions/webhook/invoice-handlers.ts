import Stripe from 'stripe';

import { logPaymentEvent } from './payment-event-helpers';

export async function handleInvoicePaymentSucceeded(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoice = event.data.object as any;

  if (!invoice.subscription) return;

  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription.id;

  // Find the seat rows
  const { data: seats } = await adminClient
    .from('workspace_module_seats')
    .select('id, workspace_id, status')
    .eq('provider_subscription_id', subscriptionId);

  if (!seats || seats.length === 0) return;

  const seatIds = seats.map((s: { id: string }) => s.id);
  const inactiveSeatIds = seats
    .filter((s: { status: string }) => s.status !== 'active')
    .map((s: { id: string }) => s.id);

  // Ensure status is active
  if (inactiveSeatIds.length > 0) {
    await adminClient
      .from('workspace_module_seats')
      .update({ status: 'active' })
      .in('id', inactiveSeatIds);
  }

  await logPaymentEvent(adminClient, {
    workspace_id: seats[0].workspace_id,
    seat_id: seatIds[0],
    event_type: 'invoice.payment_succeeded',
    provider_event_id: event.id,
    payload: {
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      amount_paid: invoice.amount_paid,
      currency: invoice.currency,
    },
    processed_at: new Date().toISOString(),
  });
}

/**
 * invoice.payment_failed
 *
 * Sets seat status to 'past_due' on payment failure.
 */
export async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoice = event.data.object as any;

  if (!invoice.subscription) return;

  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription.id;

  // Find the seat rows
  const { data: seats } = await adminClient
    .from('workspace_module_seats')
    .select('id, workspace_id')
    .eq('provider_subscription_id', subscriptionId);

  if (!seats || seats.length === 0) return;

  const seatIds = seats.map((s: { id: string }) => s.id);

  await adminClient
    .from('workspace_module_seats')
    .update({ status: 'past_due' })
    .in('id', seatIds);

  await logPaymentEvent(adminClient, {
    workspace_id: seats[0].workspace_id,
    seat_id: seatIds[0],
    event_type: 'invoice.payment_failed',
    provider_event_id: event.id,
    payload: {
      invoice_id: invoice.id,
      subscription_id: subscriptionId,
      amount_due: invoice.amount_due,
      currency: invoice.currency,
      attempt_count: invoice.attempt_count,
    },
    processed_at: new Date().toISOString(),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Log a payment event to the payment_events table.
 * Idempotent — provider_event_id uniqueness prevents duplicates.
 */
