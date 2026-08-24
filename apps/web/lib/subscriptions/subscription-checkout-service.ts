import 'server-only';

import type { PricingCheckoutRequest } from './contracts';
import { SubscriptionApiError } from './errors';
import { SubscriptionModuleUserService } from './subscription-module-user-service';

export class SubscriptionCheckoutService extends SubscriptionModuleUserService {
  async createCheckout(
    input: PricingCheckoutRequest,
    actor: { id: string; email?: string },
  ) {
    const existingBilling = await this.repository.getBillingSubscription(
      input.workspaceId,
    );
    if (existingBilling) {
      throw new SubscriptionApiError(
        'This workspace already has a Stripe subscription; use upgrade or add module',
        409,
        'CONFLICT',
      );
    }
    const legacyBilling = await this.client
      .from('workspace_module_seats')
      .select('id')
      .eq('workspace_id', input.workspaceId)
      .not('provider_subscription_id', 'is', null)
      .neq('status', 'cancelled')
      .limit(1)
      .maybeSingle();
    if (legacyBilling.error) throw legacyBilling.error;
    if (legacyBilling.data) {
      throw new SubscriptionApiError(
        'Synchronize the existing Stripe subscription before changing plans',
        409,
        'CONFLICT',
        { providerSyncRequired: true },
      );
    }
    const [workspace, productModule, plan] = await Promise.all([
      this.client
        .from('workspaces')
        .select('name')
        .eq('id', input.workspaceId)
        .single(),
      this.repository.getModule(input.moduleKey),
      this.repository.getPlan(input.planKey),
    ]);
    if (workspace.error) throw workspace.error;
    if (!plan.is_paid) {
      throw new SubscriptionApiError(
        'Free plans do not require checkout',
        409,
        'CONFLICT',
      );
    }
    const price = await this.repository.getModulePrice(
      productModule.id,
      plan.id,
    );
    const providerPrice = await this.repository.getProviderPrice(
      price.id,
      input.billingCycle,
    );
    let billingAccount = await this.client
      .from('workspace_billing_accounts')
      .select('*')
      .eq('workspace_id', input.workspaceId)
      .eq('provider', 'stripe')
      .maybeSingle();
    if (billingAccount.error) throw billingAccount.error;
    if (!billingAccount.data?.provider_customer_id) {
      const customer = await this.provider.createCustomer({
        workspaceId: input.workspaceId,
        email: actor.email,
        name: workspace.data.name,
      });
      billingAccount = await this.client
        .from('workspace_billing_accounts')
        .upsert(
          {
            workspace_id: input.workspaceId,
            provider: 'stripe',
            provider_customer_id: customer.id,
            is_active: true,
          },
          { onConflict: 'workspace_id,provider' },
        )
        .select('*')
        .single();
      if (billingAccount.error) throw billingAccount.error;
    }
    const session = await this.provider.createCheckout({
      customerId: billingAccount.data!.provider_customer_id!,
      workspaceId: input.workspaceId,
      userId: actor.id,
      moduleKey: input.moduleKey,
      moduleId: productModule.id,
      planKey: input.planKey,
      planId: plan.id,
      modulePriceId: price.id,
      providerPriceId: providerPrice.provider_price_id!,
      billingCycle: input.billingCycle,
      quantity: await this.getBillingQuantity(
        input.workspaceId,
        productModule.id,
      ),
      returnUrl: input.returnUrl,
    });
    if (!session.url) {
      throw new SubscriptionApiError(
        'Stripe did not return a checkout URL',
        502,
        'PROVIDER_ERROR',
      );
    }
    return { url: session.url, sessionId: session.id };
  }
}
