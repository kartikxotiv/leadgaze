import Stripe from 'stripe';

import {
  autoAssignSeatToBuyer,
  logPaymentEvent,
} from './payment-event-helpers';

export async function handleCheckoutCompleted(
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
