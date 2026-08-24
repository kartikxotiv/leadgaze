import Stripe from 'stripe';

import { SubscriptionNotificationService } from '~/lib/subscriptions/notification-service';
import {
  registerStripeCheckout,
  synchronizeStripeSubscription,
} from '~/lib/subscriptions/stripe-sync';

import {
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
} from './invoice-handlers';
import {
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from './subscription-handlers';

export async function handlePricingCheckoutCompleted(
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

export async function handleCompatibleSubscriptionUpdated(
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

export async function handleCompatibleSubscriptionDeleted(
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
  await new SubscriptionNotificationService().emitBestEffort({
    workspaceId: billing.workspace_id,
    eventType: 'subscription_cancelled',
    eventKey: `subscription_cancelled:${subscription.id}`,
    title: 'Subscription cancelled',
    message: hasFreeModule
      ? 'Paid billing has ended. Your Free Forever modules remain available.'
      : 'The subscription and its paid modules have been cancelled.',
    email: true,
  });
}

export async function handleCompatibleInvoice(
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
      .select('id, workspace_id, workspace_subscription_id')
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
      if (!succeeded) {
        await new SubscriptionNotificationService().emitBestEffort({
          workspaceId: billing.workspace_id,
          eventType: 'payment_failed',
          eventKey: `payment_failed:${event.id}`,
          title: 'Subscription payment failed',
          message:
            'Update the Stripe payment method to prevent subscription interruption.',
          email: true,
        });
      }
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
