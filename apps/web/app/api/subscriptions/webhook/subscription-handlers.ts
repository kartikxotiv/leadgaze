import Stripe from 'stripe';

import { logPaymentEvent } from './payment-event-helpers';

export async function handleSubscriptionUpdated(
  event: Stripe.Event,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminClient: any,
) {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = subscription.metadata ?? {};
  const workspaceId = metadata.workspace_id;

  if (!workspaceId) {
    return;
  }

  // Find ALL seat rows for this subscription
  const { data: seats } = await adminClient
    .from('workspace_module_seats')
    .select('id, provider_metadata, subscription_products(stripe_product_id)')
    .eq('provider_subscription_id', subscription.id);

  if (!seats || seats.length === 0) {
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
export async function handleSubscriptionDeleted(
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
