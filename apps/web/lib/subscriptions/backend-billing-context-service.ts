import 'server-only';

import { BackendBillingBase } from './backend-billing-base';
import type {
  BillingClient,
  CreatePlanInvoiceInput,
} from './backend-billing-types';
import { SubscriptionApiError } from './errors';

export abstract class BackendBillingContextService extends BackendBillingBase {
  protected async loadBundleContext(workspaceId: string, bundleKey: string) {
    const [workspace, bundle, subscription] = await Promise.all([
      this.billingClient
        .from('workspaces')
        .select('name, owner_id')
        .eq('id', workspaceId)
        .single(),
      this.billingClient
        .from('bundles')
        .select(
          '*, plans!inner(id, plan_key, plan_name, display_order, is_paid, is_active)',
        )
        .eq('bundle_key', bundleKey)
        .eq('is_active', true)
        .single(),
      this.billingClient
        .from('workspace_subscriptions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .maybeSingle(),
    ]);
    if (workspace.error || !workspace.data) throw workspace.error;
    if (bundle.error || !bundle.data) {
      throw new SubscriptionApiError('Bundle not found', 404, 'NOT_FOUND');
    }
    if (subscription.error) throw subscription.error;
    if (!subscription.data) {
      throw new SubscriptionApiError(
        'The workspace does not have an explicit subscription',
        404,
        'ENTITLEMENT_CONTEXT_MISSING',
      );
    }
    const plan = Array.isArray(bundle.data.plans)
      ? bundle.data.plans[0]
      : bundle.data.plans;
    if (!plan?.is_active || !plan.is_paid) {
      throw new SubscriptionApiError(
        'The selected bundle does not have an active paid plan',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }
    const mappings = await this.billingClient
      .from('bundle_modules')
      .select(
        'module_id, subscription_products!inner(id, product_key, display_name, is_active)',
      )
      .eq('bundle_id', bundle.data.id);
    if (mappings.error) throw mappings.error;
    const modules = (mappings.data ?? [])
      .map((mapping: BillingClient) =>
        Array.isArray(mapping.subscription_products)
          ? mapping.subscription_products[0]
          : mapping.subscription_products,
      )
      .filter((module: BillingClient) => module?.is_active);
    const moduleKeys = new Set(
      modules.map((module: BillingClient) => module.product_key),
    );
    if (
      modules.length !== 2 ||
      !moduleKeys.has('sales') ||
      !moduleKeys.has('service_cloud')
    ) {
      throw new SubscriptionApiError(
        'Sales + Service bundle mapping is incomplete',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    }
    const seatResult = await this.billingClient
      .from('workspace_module_seats')
      .select('*')
      .eq('workspace_id', workspaceId)
      .in(
        'product_id',
        modules.map((module: BillingClient) => module.id),
      );
    if (seatResult.error) throw seatResult.error;
    const seatByModuleId = new Map<string, BillingClient>(
      (seatResult.data ?? []).map((seat: BillingClient) => [
        String(seat.product_id),
        seat,
      ]),
    );
    return {
      workspace: workspace.data,
      bundle: bundle.data,
      plan,
      subscription: subscription.data,
      modules,
      seatByModuleId,
    };
  }

  protected async loadPlanContext(input: CreatePlanInvoiceInput) {
    const [workspace, module, plan, subscription] = await Promise.all([
      this.billingClient
        .from('workspaces')
        .select('name, owner_id')
        .eq('id', input.workspaceId)
        .single(),
      this.billingClient
        .from('subscription_products')
        .select('id, product_key, display_name')
        .eq('product_key', input.moduleKey)
        .eq('is_active', true)
        .single(),
      this.billingClient
        .from('plans')
        .select('*')
        .eq('plan_key', input.planKey)
        .eq('is_active', true)
        .single(),
      this.billingClient
        .from('workspace_subscriptions')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .maybeSingle(),
    ]);
    if (workspace.error || !workspace.data) throw workspace.error;
    if (module.error || !module.data)
      throw new SubscriptionApiError('Module not found', 404, 'NOT_FOUND');
    if (plan.error || !plan.data)
      throw new SubscriptionApiError('Plan not found', 404, 'NOT_FOUND');
    if (subscription.error) throw subscription.error;
    if (!subscription.data) {
      throw new SubscriptionApiError(
        'The workspace does not have an explicit subscription',
        404,
        'ENTITLEMENT_CONTEXT_MISSING',
      );
    }
    const [price, seat] = await Promise.all([
      this.billingClient
        .from('module_plan_prices')
        .select('*')
        .eq('module_id', module.data.id)
        .eq('plan_id', plan.data.id)
        .eq('is_active', true)
        .single(),
      this.billingClient
        .from('workspace_module_seats')
        .select('*')
        .eq('workspace_id', input.workspaceId)
        .eq('product_id', module.data.id)
        .maybeSingle(),
    ]);
    if (price.error || !price.data)
      throw new SubscriptionApiError(
        'No active backend price is configured for this module and plan',
        409,
        'ENTITLEMENT_CONFIGURATION_ERROR',
      );
    if (seat.error) throw seat.error;
    return {
      workspace: workspace.data,
      module: module.data,
      plan: plan.data,
      subscription: subscription.data,
      price: price.data,
      seat: seat.data,
    };
  }

  protected async applyEntitledPlan(input: BillingClient) {
    await this.applyPlanWithoutPayment(input, true);
  }

  protected async applyFreePlan(input: BillingClient) {
    await this.applyPlanWithoutPayment(input, false);
  }

  private async applyPlanWithoutPayment(
    input: BillingClient,
    entitled: boolean,
  ) {
    const now = new Date().toISOString();
    const moduleSubscription = await this.billingClient
      .from('workspace_module_subscriptions')
      .upsert(
        {
          workspace_subscription_id: input.subscription.id,
          workspace_id: input.workspaceId,
          module_id: input.module.id,
          plan_id: input.plan.id,
          status: 'active',
          monthly_amount: entitled ? 0 : input.price.monthly_price,
          annual_amount: entitled ? 0 : input.price.annual_price,
          started_at: now,
          cancelled_at: null,
        },
        { onConflict: 'workspace_id,module_id' },
      );
    if (moduleSubscription.error) throw moduleSubscription.error;
    const seat = await this.billingClient.from('workspace_module_seats').upsert(
      {
        workspace_id: input.workspaceId,
        product_id: input.module.id,
        seats_purchased: input.seats,
        status: 'active',
        billing_cycle: input.billingCycle,
        current_period_start: null,
        current_period_end: null,
        trial_ends_at: null,
        payment_provider: 'manual',
        provider_customer_id: null,
        provider_subscription_id: null,
        provider_metadata: {
          billing_bypassed: true,
          reason: entitled ? 'active_entitlement' : 'free_plan',
        },
        created_by: input.actor.id,
        updated_by: input.actor.id,
      },
      { onConflict: 'workspace_id,product_id' },
    );
    if (seat.error) throw seat.error;
  }
}
