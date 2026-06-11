import { NextRequest, NextResponse } from 'next/server';

import Stripe from 'stripe';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  getStripeClient,
  getStripeWebhookSecret,
} from '~/lib/stripe/stripe-client';

/**
 * POST /api/subscriptions/webhook
 *
 * Receives Stripe webhook events and synchronises them
 * to the Leadgaze database.
 *
 * This route does NOT use enhanceRouteHandler with auth —
 * Stripe calls this endpoint, not authenticated users.
 * Signature verification provides security.
 */
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
  const { data: existingEvent } = await adminClient
    .from('payment_events')
    .select('id')
    .eq('payment_provider', 'stripe')
    .eq('provider_event_id', event.id)
    .maybeSingle();

  if (existingEvent) {
    // Already processed — return 200 so Stripe doesn't retry
    return NextResponse.json({ received: true, duplicate: true });
  }

  // ── Route event to handler ────────────────────────────────────
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event, adminClient, stripe);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event, adminClient);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event, adminClient);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event, adminClient);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event, adminClient);
        break;

      default:
        // Log unhandled event types for observability
        await logPaymentEvent(adminClient, {
          workspace_id: null,
          seat_id: null,
          event_type: event.type,
          provider_event_id: event.id,
          payload: event.data.object,
          processed_at: new Date().toISOString(),
        });
        break;
    }
  } catch (err) {
    console.error(`Stripe webhook error for event ${event.type}:`, err);

    // Log the failure
    await logPaymentEvent(adminClient, {
      workspace_id: null,
      seat_id: null,
      event_type: event.type,
      provider_event_id: event.id,
      payload: event.data.object,
      processing_error: err instanceof Error ? err.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Webhook handler error' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

// ─── Event Handlers ──────────────────────────────────────────────

/**
 * checkout.session.completed
 *
 * Fired when a customer successfully completes checkout.
 * Supports both single-product and multi-product checkouts.
 */
async function handleCheckoutCompleted(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  stripe: Stripe,
) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};

  const workspaceId = metadata.workspace_id;
  const billingCycle = metadata.billing_cycle || 'monthly';
  const userId = metadata.user_id;

  if (!workspaceId) {
    console.error(
      'checkout.session.completed missing workspace_id in metadata:',
      metadata,
    );
    return;
  }

  // Get the Stripe subscription ID
  let stripeSubscriptionId: string | null = null;
  if (typeof session.subscription === 'string') {
    stripeSubscriptionId = session.subscription;
  }

  // Retrieve the full subscription to get all items
  let subscriptionItems: Stripe.SubscriptionItem[] = [];
  if (stripeSubscriptionId) {
    const subscription =
      await stripe.subscriptions.retrieve(stripeSubscriptionId);
    subscriptionItems = subscription.items.data;
  }

  // Detect multi-product vs single-product checkout
  const itemCount = metadata.item_count
    ? parseInt(metadata.item_count, 10)
    : null;

  if (itemCount && itemCount > 0) {
    // Multi-product checkout
    for (let idx = 0; idx < itemCount; idx++) {
      const productId = metadata[`item_${idx}_product_id`];
      const productKey = metadata[`item_${idx}_product_key`];
      const seats = parseInt(metadata[`item_${idx}_seats`] ?? '1', 10);

      if (!productId) {
        console.warn(`Missing item_${idx}_product_id in checkout metadata`);
        continue;
      }

      // Match subscription item by index
      const subItem = subscriptionItems[idx];
      const stripeSubItemId = subItem?.id ?? null;
      const quantity = subItem?.quantity ?? seats;
      const periodStart = subItem
        ? new Date(subItem.current_period_start * 1000).toISOString()
        : null;
      const periodEnd = subItem
        ? new Date(subItem.current_period_end * 1000).toISOString()
        : null;

      await upsertSeatAndAssign(
        adminClient,
        workspaceId,
        productId,
        productKey,
        quantity,
        billingCycle,
        periodStart,
        periodEnd,
        session,
        stripeSubscriptionId,
        stripeSubItemId,
        userId,
        `${event.id}_${idx}`,
      );
    }
  } else {
    // Legacy single-product checkout
    const productKey = metadata.product_key;
    const productId = metadata.product_id;

    if (!productId) {
      console.error(
        'checkout.session.completed missing product_id in metadata:',
        metadata,
      );
      return;
    }

    const subItem = subscriptionItems[0];
    const stripeSubItemId = subItem?.id ?? null;
    const quantity = subItem?.quantity ?? 1;
    const periodStart = subItem
      ? new Date(subItem.current_period_start * 1000).toISOString()
      : null;
    const periodEnd = subItem
      ? new Date(subItem.current_period_end * 1000).toISOString()
      : null;

    await upsertSeatAndAssign(
      adminClient,
      workspaceId,
      productId,
      productKey,
      quantity,
      billingCycle,
      periodStart,
      periodEnd,
      session,
      stripeSubscriptionId,
      stripeSubItemId,
      userId,
      `${event.id}_single`,
    );
  }
}

/**
 * Shared helper: upsert a workspace_module_seats row and auto-assign buyer.
 */
async function upsertSeatAndAssign(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  workspaceId: string,
  productId: string,
  productKey: string | undefined,
  quantity: number,
  billingCycle: string,
  currentPeriodStart: string | null,
  currentPeriodEnd: string | null,
  session: Stripe.Checkout.Session,
  stripeSubscriptionId: string | null,
  stripeSubscriptionItemId: string | null,
  userId: string | undefined,
  paymentEventId: string,
) {
  // Check if workspace already has a seat row for this product
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingSeat } = await adminClient
    .from('workspace_module_seats')
    .select('id, seats_purchased, status')
    .eq('workspace_id', workspaceId)
    .eq('product_id', productId)
    .maybeSingle();

  let seatId: string;

  if (existingSeat) {
    // Upgrade existing seat row (trial -> paid, or quantity change)
    const { data } = await adminClient
      .from('workspace_module_seats')
      .update({
        seats_purchased: quantity,
        status: 'active',
        billing_cycle: billingCycle,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        payment_provider: 'stripe',
        provider_customer_id: session.customer as string,
        provider_subscription_id: stripeSubscriptionId,
        provider_metadata: {
          stripe_subscription_item_id: stripeSubscriptionItemId,
          checkout_session_id: session.id,
          billing_cycle: billingCycle,
          upgraded_from_trial: existingSeat.status === 'trialing',
        },
        updated_by: userId,
      })
      .eq('id', existingSeat.id)
      .select('id')
      .single();

    seatId = data?.id ?? existingSeat.id;
  } else {
    // Create new seat row
    const { data, error } = await adminClient
      .from('workspace_module_seats')
      .insert({
        workspace_id: workspaceId,
        product_id: productId,
        seats_purchased: quantity,
        seats_used: 0,
        status: 'active',
        billing_cycle: billingCycle,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        payment_provider: 'stripe',
        provider_customer_id: session.customer as string,
        provider_subscription_id: stripeSubscriptionId,
        provider_metadata: {
          stripe_subscription_item_id: stripeSubscriptionItemId,
          checkout_session_id: session.id,
          billing_cycle: billingCycle,
        },
        created_by: userId,
        updated_by: userId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Create workspace_module_seats error:', error);
      throw error;
    }

    seatId = data.id;
  }

  // Log payment event
  await logPaymentEvent(adminClient, {
    workspace_id: workspaceId,
    seat_id: seatId,
    event_type: 'checkout.session.completed',
    provider_event_id: paymentEventId,
    payload: {
      session_id: session.id,
      customer: session.customer,
      subscription: stripeSubscriptionId,
      product_key: productKey,
      seats: quantity,
      billing_cycle: billingCycle,
      amount_total: session.amount_total,
      currency: session.currency,
    },
    processed_at: new Date().toISOString(),
  });

  // Auto-assign seat to the buyer
  if (userId) {
    await autoAssignSeatToBuyer(
      adminClient,
      workspaceId,
      userId,
      productId,
      seatId,
    );
  }
}

/**
 * customer.subscription.updated
 *
 * Fired when subscription quantity or status changes.
 * Handles both single-item and multi-item subscriptions.
 */
async function handleSubscriptionUpdated(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
) {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = subscription.metadata ?? {};
  const workspaceId = metadata.workspace_id;

  if (!workspaceId) {
    console.warn(
      'customer.subscription.updated missing workspace_id, skipping.',
    );
    return;
  }

  // Find ALL seat rows for this subscription
  const { data: seats } = await adminClient
    .from('workspace_module_seats')
    .select('id, provider_metadata')
    .eq('provider_subscription_id', subscription.id);

  if (!seats || seats.length === 0) {
    console.warn(
      `No workspace_module_seats found for subscription ${subscription.id}`,
    );
    return;
  }

  // Status mapping
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    incomplete: 'active',
    paused: 'cancelled',
  };
  const mappedStatus = statusMap[subscription.status];

  // Update each subscription item's corresponding seat row
  for (const subItem of subscription.items.data) {
    // Find the seat row that matches this subscription item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchingSeat = seats.find((s: any) => {
      const meta = s.provider_metadata ?? {};
      return meta.stripe_subscription_item_id === subItem.id;
    });

    if (!matchingSeat) {
      // If only one seat row and one item, match directly
      if (seats.length === 1) {
        // fall through and use the single seat
      } else {
        console.warn(`No seat row found for subscription item ${subItem.id}`);
        continue;
      }
    }

    const seatToUpdate = matchingSeat ?? seats[0];

    const updatePayload: Record<string, unknown> = {
      current_period_start: new Date(
        subItem.current_period_start * 1000,
      ).toISOString(),
      current_period_end: new Date(
        subItem.current_period_end * 1000,
      ).toISOString(),
    };

    if (subItem.quantity != null) {
      updatePayload.seats_purchased = subItem.quantity;
    }

    if (mappedStatus) {
      updatePayload.status = mappedStatus;
    }

    updatePayload.provider_metadata = {
      stripe_subscription_item_id: subItem.id,
    };

    await adminClient
      .from('workspace_module_seats')
      .update(updatePayload)
      .eq('id', seatToUpdate.id);
  }

  await logPaymentEvent(adminClient, {
    workspace_id: workspaceId,
    seat_id: seats[0]?.id ?? null,
    event_type: 'customer.subscription.updated',
    provider_event_id: event.id,
    payload: {
      subscription_id: subscription.id,
      status: subscription.status,
      items: subscription.items.data.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        price: i.price.id,
      })),
    },
    processed_at: new Date().toISOString(),
  });
}

/**
 * customer.subscription.deleted
 *
 * Fired when a subscription is fully cancelled.
 * Sets seat status to 'cancelled'.
 */
async function handleSubscriptionDeleted(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
) {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = subscription.metadata ?? {};

  // Find the seat row
  const { data: seat } = await adminClient
    .from('workspace_module_seats')
    .select('id, workspace_id')
    .eq('provider_subscription_id', subscription.id)
    .maybeSingle();

  if (!seat) {
    console.warn(
      `No workspace_module_seats found for deleted subscription ${subscription.id}`,
    );
    return;
  }

  await adminClient
    .from('workspace_module_seats')
    .update({
      status: 'cancelled',
    })
    .eq('id', seat.id);

  await logPaymentEvent(adminClient, {
    workspace_id: seat.workspace_id,
    seat_id: seat.id,
    event_type: 'customer.subscription.deleted',
    provider_event_id: event.id,
    payload: {
      subscription_id: subscription.id,
      product_key: metadata.product_key,
    },
    processed_at: new Date().toISOString(),
  });
}

/**
 * invoice.payment_succeeded
 *
 * Ensures seat status is 'active' after successful payment.
 */
async function handleInvoicePaymentSucceeded(
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

  // Find the seat row
  const { data: seat } = await adminClient
    .from('workspace_module_seats')
    .select('id, workspace_id, status')
    .eq('provider_subscription_id', subscriptionId)
    .maybeSingle();

  if (!seat) return;

  // Ensure status is active
  if (seat.status !== 'active') {
    await adminClient
      .from('workspace_module_seats')
      .update({ status: 'active' })
      .eq('id', seat.id);
  }

  await logPaymentEvent(adminClient, {
    workspace_id: seat.workspace_id,
    seat_id: seat.id,
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
async function handleInvoicePaymentFailed(
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

  // Find the seat row
  const { data: seat } = await adminClient
    .from('workspace_module_seats')
    .select('id, workspace_id')
    .eq('provider_subscription_id', subscriptionId)
    .maybeSingle();

  if (!seat) return;

  await adminClient
    .from('workspace_module_seats')
    .update({ status: 'past_due' })
    .eq('id', seat.id);

  await logPaymentEvent(adminClient, {
    workspace_id: seat.workspace_id,
    seat_id: seat.id,
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
async function logPaymentEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  data: {
    workspace_id: string | null;
    seat_id: string | null;
    event_type: string;
    provider_event_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: any;
    processed_at?: string;
    processing_error?: string;
  },
) {
  try {
    await adminClient.from('payment_events').insert({
      workspace_id: data.workspace_id,
      seat_id: data.seat_id,
      payment_provider: 'stripe',
      provider_event_id: data.provider_event_id,
      event_type: data.event_type,
      payload: data.payload,
      processed_at: data.processed_at ?? null,
      processing_error: data.processing_error ?? null,
    });
  } catch (err) {
    // Duplicate event — ignore (unique constraint on provider_event_id)
    console.warn('Payment event log insert skipped (likely duplicate):', err);
  }
}

/**
 * Auto-assign a seat to the buyer after successful checkout.
 * Same logic as the dummy-checkout helper.
 */
async function autoAssignSeatToBuyer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  workspaceId: string,
  userId: string,
  productId: string,
  seatId: string,
) {
  try {
    // Check if buyer already has an active assignment for this product
    const { data: existing } = await adminClient
      .from('seat_assignments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) return;

    // Check for a previously revoked assignment to reactivate
    const { data: inactive } = await adminClient
      .from('seat_assignments')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .eq('product_id', productId)
      .eq('is_active', false)
      .maybeSingle();

    if (inactive) {
      await adminClient
        .from('seat_assignments')
        .update({
          is_active: true,
          assigned_at: new Date().toISOString(),
          assigned_by: userId,
          revoked_at: null,
          revoked_by: null,
        })
        .eq('id', inactive.id);
      return;
    }

    // Create new assignment
    await adminClient.from('seat_assignments').insert({
      seat_id: seatId,
      workspace_id: workspaceId,
      user_id: userId,
      product_id: productId,
      is_active: true,
      assigned_by: userId,
    });
  } catch (error) {
    console.error('Auto-assign seat to buyer error:', error);
  }
}
