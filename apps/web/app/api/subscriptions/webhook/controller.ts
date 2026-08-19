import { NextRequest, NextResponse } from 'next/server';

import Stripe from 'stripe';

import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  getStripeClient,
  getStripeWebhookSecret,
} from '~/lib/stripe/stripe-client';
import {
  registerStripeCheckout,
  synchronizeStripeSubscription,
} from '~/lib/subscriptions/stripe-sync';

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

async function handlePricingCheckoutCompleted(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  stripe: Stripe,
) {
  const session = event.data.object as Stripe.Checkout.Session;
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
  if (!subscriptionId) throw new Error('Checkout is missing a subscription');
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });
  await registerStripeCheckout({ client: adminClient, session, subscription });
}

async function handleCompatibleSubscriptionUpdated(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
) {
  const subscription = event.data.object as Stripe.Subscription;
  const { data: billing } = await adminClient
    .from('workspace_billing_subscriptions')
    .select('id')
    .eq('provider_subscription_id', subscription.id)
    .maybeSingle();
  if (billing) {
    await synchronizeStripeSubscription({ client: adminClient, subscription });
    return;
  }
  await handleSubscriptionUpdated(event, adminClient);
}

async function handleCompatibleSubscriptionDeleted(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
) {
  const subscription = event.data.object as Stripe.Subscription;
  const { data: billing } = await adminClient
    .from('workspace_billing_subscriptions')
    .select('id, workspace_id, workspace_subscription_id')
    .eq('provider_subscription_id', subscription.id)
    .maybeSingle();
  if (!billing) {
    await handleSubscriptionDeleted(event, adminClient);
    return;
  }
  const now = new Date().toISOString();
  const { error: applyError } = await adminClient.rpc(
    'apply_due_subscription_changes',
    {
      p_workspace_id: billing.workspace_id,
    },
  );
  if (applyError) throw applyError;
  await adminClient
    .from('workspace_billing_subscriptions')
    .update({ provider_status: 'canceled', cancel_at_period_end: false })
    .eq('id', billing.id);
  const { data: modules } = await adminClient
    .from('workspace_module_subscriptions')
    .select('id, status, plans(is_paid)')
    .eq('workspace_id', billing.workspace_id)
    .neq('status', 'cancelled');
  const paidModuleIds = (modules ?? [])
    .filter((module: { plans?: { is_paid?: boolean } }) => {
      const plan = Array.isArray(module.plans) ? module.plans[0] : module.plans;
      return plan?.is_paid;
    })
    .map((module: { id: string }) => module.id);
  if (paidModuleIds.length) {
    await adminClient
      .from('workspace_module_subscriptions')
      .update({ status: 'cancelled', cancelled_at: now })
      .in('id', paidModuleIds);
    await adminClient
      .from('subscription_changes')
      .update({ status: 'applied', applied_at: now })
      .in('workspace_module_subscription_id', paidModuleIds)
      .eq('status', 'pending');
  }
  const hasFreeModule = (modules ?? []).some(
    (module: { status?: string; plans?: { is_paid?: boolean } }) => {
      const plan = Array.isArray(module.plans) ? module.plans[0] : module.plans;
      return plan && !plan.is_paid && module.status !== 'cancelled';
    },
  );
  await adminClient
    .from('workspace_subscriptions')
    .update({ subscription_status: hasFreeModule ? 'free' : 'cancelled' })
    .eq('id', billing.workspace_subscription_id);
}

async function handleCompatibleInvoice(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
  succeeded: boolean,
) {
  // Stripe's invoice subscription field differs across API versions.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const invoice = event.data.object as any;
  const subscriptionId =
    typeof invoice.subscription === 'string'
      ? invoice.subscription
      : (invoice.subscription?.id ??
        invoice.parent?.subscription_details?.subscription);
  if (subscriptionId) {
    const { data: billing } = await adminClient
      .from('workspace_billing_subscriptions')
      .select('id, workspace_subscription_id')
      .eq('provider_subscription_id', subscriptionId)
      .maybeSingle();
    if (billing) {
      await adminClient
        .from('workspace_billing_subscriptions')
        .update({ provider_status: succeeded ? 'active' : 'past_due' })
        .eq('id', billing.id);
      await adminClient
        .from('workspace_subscriptions')
        .update({
          subscription_status: succeeded ? 'active' : 'payment_failed',
        })
        .eq('id', billing.workspace_subscription_id);
      return;
    }
  }
  if (succeeded) {
    await handleInvoicePaymentSucceeded(event, adminClient);
  } else {
    await handleInvoicePaymentFailed(event, adminClient);
  }
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
    .select('id, provider_metadata, subscription_products(stripe_product_id)')
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

  // Track which seat rows were updated via subscription items
  const updatedSeatIds = new Set<string>();

  // Update each subscription item's corresponding seat row
  for (const subItem of subscription.items.data) {
    // Find the seat row that matches this subscription item
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchingSeat = seats.find((s: any) => {
      const meta = s.provider_metadata ?? {};
      if (meta.stripe_subscription_item_id === subItem.id) {
        return true;
      }
      // Fallback: match by stripe product ID
      const stripeProductId = s.subscription_products?.stripe_product_id;
      const subItemProduct =
        typeof subItem.price.product === 'string'
          ? subItem.price.product
          : subItem.price.product?.id;
      return (
        stripeProductId && subItemProduct && stripeProductId === subItemProduct
      );
    });

    let seatToUpdate;
    if (matchingSeat) {
      seatToUpdate = matchingSeat;
    } else if (seats.length === 1) {
      // If only one seat row and one item, match directly
      seatToUpdate = seats[0];
    } else {
      console.warn(`No seat row found for subscription item ${subItem.id}`);
      continue;
    }

    updatedSeatIds.add(seatToUpdate.id);

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

  // Detect removed items: seats no longer in the subscription
  // (e.g., module was removed via cancel endpoint)
  for (const seat of seats) {
    if (!updatedSeatIds.has(seat.id)) {
      await adminClient
        .from('workspace_module_seats')
        .update({ status: 'cancelled' })
        .eq('id', seat.id);

      // Deactivate seat assignments for the removed module
      await adminClient
        .from('seat_assignments')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
        })
        .eq('seat_id', seat.id)
        .eq('is_active', true);
    }
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
 * Marks ALL seat rows tied to this subscription as 'cancelled'
 * and deactivates their seat assignments.
 */
async function handleSubscriptionDeleted(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
) {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = subscription.metadata ?? {};

  // Find ALL seat rows for this subscription (multi-module support)
  const { data: seats } = await adminClient
    .from('workspace_module_seats')
    .select('id, workspace_id')
    .eq('provider_subscription_id', subscription.id);

  if (!seats || seats.length === 0) {
    console.warn(
      `No workspace_module_seats found for deleted subscription ${subscription.id}`,
    );
    return;
  }

  const seatIds = seats.map((s: { id: string }) => s.id);
  const workspaceId = seats[0].workspace_id;

  // Mark all seats as cancelled
  await adminClient
    .from('workspace_module_seats')
    .update({ status: 'cancelled' })
    .in('id', seatIds);

  // Deactivate all seat assignments tied to these seats
  await adminClient
    .from('seat_assignments')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
    })
    .in('seat_id', seatIds)
    .eq('is_active', true);

  await logPaymentEvent(adminClient, {
    workspace_id: workspaceId,
    seat_id: seatIds[0],
    event_type: 'customer.subscription.deleted',
    provider_event_id: event.id,
    payload: {
      subscription_id: subscription.id,
      product_key: metadata.product_key,
      seats_cancelled: seatIds.length,
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
