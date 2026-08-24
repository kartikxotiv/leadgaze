import 'server-only';

import type Stripe from 'stripe';

import { getStripeClient } from '~/lib/stripe/stripe-client';

import { SubscriptionApiError } from './errors';

function providerError(error: unknown): never {
  throw new SubscriptionApiError(
    error instanceof Error ? error.message : 'Stripe request failed',
    502,
    'PROVIDER_ERROR',
  );
}

export class StripeSubscriptionProvider {
  private readonly stripe = getStripeClient();

  async createCustomer(params: {
    workspaceId: string;
    email?: string;
    name?: string;
  }) {
    try {
      return await this.stripe.customers.create({
        email: params.email,
        name: params.name ?? 'Leadgaze Workspace',
        metadata: { workspace_id: params.workspaceId },
      });
    } catch (error) {
      providerError(error);
    }
  }

  async createCheckout(params: {
    customerId: string;
    workspaceId: string;
    userId: string;
    moduleKey: string;
    moduleId: string;
    planKey: string;
    planId: string;
    modulePriceId: string;
    providerPriceId: string;
    billingCycle: 'monthly' | 'yearly';
    quantity: number;
    returnUrl?: string;
  }) {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
      const returnPath = params.returnUrl ?? '/org/subscription';
      const separator = returnPath.includes('?') ? '&' : '?';
      const metadata = {
        pricing_model: 'v1',
        workspace_id: params.workspaceId,
        user_id: params.userId,
        module_key: params.moduleKey,
        module_id: params.moduleId,
        plan_key: params.planKey,
        plan_id: params.planId,
        module_price_id: params.modulePriceId,
        billing_cycle: params.billingCycle,
      };
      return await this.stripe.checkout.sessions.create({
        customer: params.customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          { price: params.providerPriceId, quantity: params.quantity },
        ],
        metadata,
        subscription_data: { metadata },
        success_url: `${appUrl}${returnPath}${separator}checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}${returnPath}${separator}checkout=cancel`,
        allow_promotion_codes: true,
      });
    } catch (error) {
      providerError(error);
    }
  }

  async retrieveSubscription(providerSubscriptionId: string) {
    try {
      return await this.stripe.subscriptions.retrieve(providerSubscriptionId, {
        expand: ['items.data.price'],
      });
    } catch (error) {
      providerError(error);
    }
  }

  async applyItemPrice(params: {
    providerSubscriptionId: string;
    providerSubscriptionItemId: string;
    providerPriceId: string;
  }) {
    try {
      return await this.stripe.subscriptions.update(
        params.providerSubscriptionId,
        {
          items: [
            {
              id: params.providerSubscriptionItemId,
              price: params.providerPriceId,
            },
          ],
          proration_behavior: 'always_invoice',
        },
      );
    } catch (error) {
      providerError(error);
    }
  }

  async addItem(params: {
    providerSubscriptionId: string;
    providerPriceId: string;
    quantity: number;
  }) {
    try {
      return await this.stripe.subscriptionItems.create({
        subscription: params.providerSubscriptionId,
        price: params.providerPriceId,
        quantity: params.quantity,
        proration_behavior: 'always_invoice',
      });
    } catch (error) {
      providerError(error);
    }
  }

  async scheduleItemPrice(params: {
    providerSubscriptionId: string;
    providerSubscriptionItemId: string;
    providerPriceId: string;
  }) {
    return this.scheduleNextPhase(params.providerSubscriptionId, (items) =>
      items.map((item) =>
        item.id === params.providerSubscriptionItemId
          ? { price: params.providerPriceId, quantity: item.quantity ?? 1 }
          : { price: item.price.id, quantity: item.quantity ?? 1 },
      ),
    );
  }

  async scheduleItemRemoval(params: {
    providerSubscriptionId: string;
    providerSubscriptionItemId: string;
  }) {
    const subscription = await this.retrieveSubscription(
      params.providerSubscriptionId,
    );
    if (subscription.items.data.length === 1) {
      try {
        await this.stripe.subscriptions.update(params.providerSubscriptionId, {
          cancel_at_period_end: true,
        });
        return;
      } catch (error) {
        providerError(error);
      }
    }
    return this.scheduleNextPhase(params.providerSubscriptionId, (items) =>
      items
        .filter((item) => item.id !== params.providerSubscriptionItemId)
        .map((item) => ({
          price: item.price.id,
          quantity: item.quantity ?? 1,
        })),
    );
  }

  private async scheduleNextPhase(
    providerSubscriptionId: string,
    nextItems: (items: Stripe.SubscriptionItem[]) => Array<{
      price: string;
      quantity: number;
    }>,
  ) {
    try {
      const subscription = await this.retrieveSubscription(
        providerSubscriptionId,
      );
      const firstItem = subscription.items.data[0];
      if (!firstItem) throw new Error('Stripe subscription has no items');
      const periodEnd = firstItem.current_period_end;
      const currentItems = subscription.items.data.map((item) => ({
        price: item.price.id,
        quantity: item.quantity ?? 1,
      }));
      const scheduleId =
        typeof subscription.schedule === 'string'
          ? subscription.schedule
          : subscription.schedule?.id;
      const schedule = scheduleId
        ? await this.stripe.subscriptionSchedules.retrieve(scheduleId)
        : await this.stripe.subscriptionSchedules.create({
            from_subscription: providerSubscriptionId,
          });
      await this.stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: 'release',
        phases: [
          {
            items: currentItems,
            start_date: schedule.current_phase?.start_date ?? 'now',
            end_date: periodEnd,
            proration_behavior: 'none',
          },
          {
            items: nextItems(subscription.items.data),
            start_date: periodEnd,
            proration_behavior: 'none',
          },
        ],
      } as never);
    } catch (error) {
      providerError(error);
    }
  }
}
