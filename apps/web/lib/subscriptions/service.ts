import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@kit/supabase/database';

import type {
  AddModuleRequest,
  AssignModuleUserRequest,
  DowngradeSubscriptionRequest,
  PricingCheckoutRequest,
  PricingResponseData,
  StartTrialRequest,
  SubscriptionModuleKey,
  UpgradeSubscriptionRequest,
  UsageResponseData,
  WorkspacePlansResponseData,
} from './contracts';
import { SubscriptionApiError } from './errors';
import {
  type SubscriptionNotificationEvent,
  SubscriptionNotificationService,
} from './notification-service';
import { SubscriptionRepository } from './repository';
import { StripeSubscriptionProvider } from './stripe-provider';
import {
  getPlanChangeDirection,
  getTrialStartRejection,
} from './subscription-rules';

type Client = SupabaseClient<Database>;
// Supabase relation cardinality is represented as either an object or an array.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>;

const asObject = (value: unknown): AnyRow => {
  if (Array.isArray(value)) return (value[0] ?? {}) as AnyRow;
  return (value ?? {}) as AnyRow;
};

const toNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

export class SubscriptionService {
  readonly repository: SubscriptionRepository;
  private readonly provider: StripeSubscriptionProvider;
  private readonly notifications = new SubscriptionNotificationService();

  constructor(
    private readonly client: Client,
    provider?: StripeSubscriptionProvider,
  ) {
    this.repository = new SubscriptionRepository(client);
    this.provider = provider ?? new StripeSubscriptionProvider();
  }

  async getPublicPricing(): Promise<PricingResponseData> {
    const rows = await this.repository.getPublicPricingRows();
    const planById = new Map(rows.plans.map((plan) => [plan.id, plan]));
    const moduleById = new Map(
      rows.modules.map((module) => [module.id, module]),
    );
    const moduleIdsByBundle = new Map<string, string[]>();
    for (const row of rows.bundleModules) {
      moduleIdsByBundle.set(row.bundle_id, [
        ...(moduleIdsByBundle.get(row.bundle_id) ?? []),
        row.module_id,
      ]);
    }
    const numericPrices = rows.prices.flatMap((price) => [
      toNumber(price.monthly_price),
      toNumber(price.annual_price),
    ]);
    const yearlyDiscounts = rows.prices.flatMap((price) => {
      const monthly = toNumber(price.monthly_price);
      const yearly = toNumber(price.annual_price);
      return monthly && yearly
        ? [Math.round((1 - yearly / (monthly * 12)) * 100)]
        : [];
    });
    void numericPrices;

    return {
      plans: rows.plans.map((plan) => ({
        planKey:
          plan.plan_key as PricingResponseData['plans'][number]['planKey'],
        planName: plan.plan_name,
        description: plan.description,
        displayOrder: plan.display_order,
        isPaid: plan.is_paid,
        isTrialEligible: plan.is_trial_eligible,
      })),
      modules: rows.modules.map((module) => ({
        moduleKey:
          module.product_key as PricingResponseData['modules'][number]['moduleKey'],
        moduleName: module.display_name,
        description: module.description,
        featureHighlights: rows.features
          .filter(
            (feature) =>
              feature.module_id === module.id &&
              feature.feature_category !== 'limits',
          )
          .slice(0, 6)
          .map((feature) => feature.feature_name),
        prices: rows.prices
          .filter((price) => price.module_id === module.id)
          .map((price) => ({
            moduleKey:
              module.product_key as PricingResponseData['modules'][number]['moduleKey'],
            planKey: planById.get(price.plan_id)!
              .plan_key as PricingResponseData['plans'][number]['planKey'],
            monthlyPrice: toNumber(price.monthly_price),
            yearlyPrice: toNumber(price.annual_price),
            currency: price.currency,
            billingUnit:
              price.billing_unit as PricingResponseData['modules'][number]['prices'][number]['billingUnit'],
          })),
      })),
      bundles: rows.bundles
        .filter(
          (bundle) =>
            bundle.monthly_price !== null && bundle.annual_price !== null,
        )
        .map((bundle) => ({
          bundleKey: bundle.bundle_key,
          bundleName: bundle.bundle_name,
          planKey: planById.get(bundle.plan_id)!
            .plan_key as PricingResponseData['plans'][number]['planKey'],
          moduleKeys: (moduleIdsByBundle.get(bundle.id) ?? []).map(
            (id) =>
              moduleById.get(id)!
                .product_key as PricingResponseData['modules'][number]['moduleKey'],
          ) as [SubscriptionModuleKey, SubscriptionModuleKey],
          monthlyPrice: Number(bundle.monthly_price),
          yearlyPrice: Number(bundle.annual_price),
          currency: bundle.currency,
        })),
      yearlyDiscountPercent:
        yearlyDiscounts.length > 0 ? Math.max(...yearlyDiscounts) : 0,
    };
  }

  async getWorkspacePlans(
    workspaceId: string,
  ): Promise<WorkspacePlansResponseData> {
    await this.repository.applyDueChanges(workspaceId);
    const rows = await this.repository.getWorkspacePlanRows(workspaceId);
    if (!rows.subscription) {
      throw new SubscriptionApiError(
        'The workspace does not have an explicit subscription',
        404,
        'ENTITLEMENT_CONTEXT_MISSING',
      );
    }
    const counts = await this.repository.getModuleUserCount(
      workspaceId,
      rows.modules.map((row) => row.module_id),
    );
    const now = Date.now();
    const trialEnd = rows.subscription.trial_end_date;
    return {
      workspaceId,
      subscriptionStatus: rows.subscription
        .subscription_status as WorkspacePlansResponseData['subscriptionStatus'],
      billingCycle: rows.subscription.billing_cycle,
      trialStartDate: rows.subscription.trial_start_date,
      trialEndDate: trialEnd,
      trialDaysRemaining: trialEnd
        ? Math.max(
            0,
            Math.ceil((new Date(trialEnd).getTime() - now) / 86400000),
          )
        : null,
      modules: rows.modules.map((row) => {
        const productModule = asObject(row.subscription_products);
        const plan = asObject(row.plans);
        const bundle = asObject(row.bundles);
        return {
          moduleKey: productModule.product_key,
          moduleName: productModule.display_name,
          planKey: plan.plan_key,
          planName: plan.plan_name,
          status: row.status,
          billingCycle: rows.subscription!.billing_cycle,
          monthlyAmount: toNumber(row.monthly_amount),
          yearlyAmount: toNumber(row.annual_amount),
          bundleKey: bundle.bundle_key ?? null,
          userCount: counts.get(row.module_id) ?? 0,
          currentPeriodStart: rows.subscription!.current_period_start,
          currentPeriodEnd: rows.subscription!.current_period_end,
        };
      }),
      pendingChanges: rows.changes.map((row) => {
        const moduleSubscription = asObject(row.workspace_module_subscriptions);
        const productModule = asObject(
          moduleSubscription.subscription_products,
        );
        return {
          id: row.id,
          moduleKey: productModule.product_key,
          changeType: row.change_type,
          fromPlanKey: asObject(row.from_plan).plan_key ?? null,
          toPlanKey: asObject(row.to_plan).plan_key ?? null,
          effectiveAt: row.effective_at,
          status: row.status,
        };
      }),
    } as WorkspacePlansResponseData;
  }

  async getUsage(
    workspaceId: string,
    moduleKey: SubscriptionModuleKey,
  ): Promise<UsageResponseData> {
    await this.repository.applyDueChanges(workspaceId);
    const rows = await this.repository.getUsageRows(workspaceId, moduleKey);
    const counters = new Map(rows.counters.map((row) => [row.feature_id, row]));
    return {
      workspaceId,
      moduleKey,
      planKey: asObject(rows.subscription.plans).plan_key,
      features: rows.features.map((feature) => {
        const counter = counters.get(feature.id);
        const currentUsage = counter?.current_usage ?? 0;
        const limitValue = counter?.limit_value ?? null;
        const percentageUsed =
          limitValue === null
            ? null
            : limitValue === 0
              ? currentUsage > 0
                ? 100
                : 0
              : Math.round((currentUsage / limitValue) * 10000) / 100;
        return {
          featureKey: feature.feature_key,
          featureName: feature.feature_name,
          limitType: feature.data_type as 'numeric',
          currentUsage,
          limitValue,
          percentageUsed,
          isNearLimit: percentageUsed !== null && percentageUsed >= 80,
          isAtLimit: limitValue !== null && currentUsage >= limitValue,
        };
      }),
    };
  }

  async startTrial(input: StartTrialRequest, actorId: string) {
    const subscription = await this.repository.getWorkspaceSubscription(
      input.workspaceId,
    );
    if (!subscription) {
      throw new SubscriptionApiError(
        'The workspace does not have an explicit subscription',
        404,
        'ENTITLEMENT_CONTEXT_MISSING',
      );
    }
    const trialRejection = getTrialStartRejection({
      trialStartDate: subscription.trial_start_date,
      subscriptionStatus: subscription.subscription_status,
    });
    if (trialRejection) {
      throw new SubscriptionApiError(
        trialRejection === 'TRIAL_ALREADY_USED'
          ? 'This workspace has already used its trial'
          : 'Only a free workspace can start a trial',
        409,
        trialRejection,
      );
    }
    const growth = await this.repository.getPlan('growth');
    const start = new Date();
    const end = new Date(start.getTime() + 14 * 86400000);
    const update = await this.client
      .from('workspace_subscriptions')
      .update({
        subscription_status: 'trial_active',
        trial_start_date: start.toISOString(),
        trial_end_date: end.toISOString(),
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
      })
      .eq('id', subscription.id)
      .is('trial_start_date', null)
      .select('id')
      .maybeSingle();
    if (update.error) throw update.error;
    if (!update.data) {
      throw new SubscriptionApiError(
        'This workspace has already used its trial',
        409,
        'TRIAL_ALREADY_USED',
      );
    }
    for (const moduleKey of input.selectedModules) {
      const productModule = await this.repository.getModule(moduleKey);
      const price = await this.repository.getModulePrice(
        productModule.id,
        growth.id,
      );
      const result = await this.client
        .from('workspace_module_subscriptions')
        .upsert(
          {
            workspace_subscription_id: subscription.id,
            workspace_id: input.workspaceId,
            module_id: productModule.id,
            plan_id: growth.id,
            status: 'trial',
            monthly_amount: price.monthly_price,
            annual_amount: price.annual_price,
            started_at: start.toISOString(),
            cancelled_at: null,
          },
          { onConflict: 'workspace_id,module_id' },
        );
      if (result.error) throw result.error;
    }
    await this.recordEvent({
      workspaceId: input.workspaceId,
      eventType: 'trial_started',
      eventKey: `trial_started:${subscription.id}:${start.toISOString()}`,
      title: 'Your 14-day Growth trial has started',
      message:
        'Growth features are active for the selected modules until the trial ends.',
      email: true,
      metadata: { selectedModules: input.selectedModules, actorId },
    });
    return {
      workspaceId: input.workspaceId,
      status: 'trial_active' as const,
      planKey: 'growth' as const,
      selectedModules: input.selectedModules,
      trialStartDate: start.toISOString(),
      trialEndDate: end.toISOString(),
    };
  }

  async upgrade(input: UpgradeSubscriptionRequest, actorId: string) {
    return this.applyImmediatePlan(
      {
        workspaceId: input.workspaceId,
        moduleKey: input.moduleKey,
        planKey: input.newPlanKey,
        billingCycle: input.billingCycle,
      },
      actorId,
      'plan_upgrade',
    );
  }

  async addModule(input: AddModuleRequest, actorId: string) {
    const productModule = await this.repository.getModule(input.moduleKey);
    const existing = await this.repository.getModuleSubscription(
      input.workspaceId,
      productModule.id,
    );
    if (existing && existing.status !== 'cancelled') {
      throw new SubscriptionApiError(
        'This module is already active for the workspace',
        409,
        'CONFLICT',
      );
    }
    return this.applyImmediatePlan(input, actorId, 'module_add');
  }

  private async applyImmediatePlan(
    input: AddModuleRequest,
    actorId: string,
    changeType: 'plan_upgrade' | 'module_add',
  ) {
    const [subscription, productModule, plan] = await Promise.all([
      this.repository.getWorkspaceSubscription(input.workspaceId),
      this.repository.getModule(input.moduleKey),
      this.repository.getPlan(input.planKey),
    ]);
    if (!subscription) {
      throw new SubscriptionApiError(
        'The workspace does not have an explicit subscription',
        404,
        'ENTITLEMENT_CONTEXT_MISSING',
      );
    }
    const price = await this.repository.getModulePrice(
      productModule.id,
      plan.id,
    );
    const current = await this.repository.getModuleSubscription(
      input.workspaceId,
      productModule.id,
    );
    const currentPlan = asObject(current?.plans);
    const planChangeDirection = current
      ? getPlanChangeDirection(
          Number(currentPlan.display_order),
          plan.display_order,
        )
      : null;
    if (changeType === 'plan_upgrade' && planChangeDirection !== 'upgrade') {
      throw new SubscriptionApiError(
        'The requested plan is not an upgrade',
        409,
        'CONFLICT',
      );
    }

    if (plan.is_paid) {
      const providerPrice = await this.repository.getProviderPrice(
        price.id,
        input.billingCycle,
      );
      const billing = await this.repository.getBillingSubscription(
        input.workspaceId,
      );
      if (!billing) {
        throw new SubscriptionApiError(
          'Checkout is required before activating a paid plan',
          402,
          'PAYMENT_REQUIRED',
          { checkoutRequired: true },
        );
      }
      const items = asObject(billing.metadata).items as
        | Record<string, string>
        | undefined;
      if (changeType === 'module_add') {
        await this.provider.addItem({
          providerSubscriptionId: billing.provider_subscription_id,
          providerPriceId: providerPrice.provider_price_id!,
          quantity: await this.getBillingQuantity(
            input.workspaceId,
            productModule.id,
          ),
        });
      } else {
        const itemId = items?.[input.moduleKey];
        if (!itemId) {
          throw new SubscriptionApiError(
            'The Stripe subscription item mapping is missing',
            409,
            'ENTITLEMENT_CONFIGURATION_ERROR',
          );
        }
        await this.provider.applyItemPrice({
          providerSubscriptionId: billing.provider_subscription_id,
          providerSubscriptionItemId: itemId,
          providerPriceId: providerPrice.provider_price_id!,
        });
      }
    }

    const now = new Date().toISOString();
    const upsert = await this.client
      .from('workspace_module_subscriptions')
      .upsert(
        {
          workspace_subscription_id: subscription.id,
          workspace_id: input.workspaceId,
          module_id: productModule.id,
          plan_id: plan.id,
          status: 'active',
          monthly_amount: price.monthly_price,
          annual_amount: price.annual_price,
          started_at: current?.started_at ?? now,
          cancelled_at: null,
        },
        { onConflict: 'workspace_id,module_id' },
      );
    if (upsert.error) throw upsert.error;
    const workspaceUpdate = await this.client
      .from('workspace_subscriptions')
      .update({
        subscription_status: plan.is_paid
          ? 'active'
          : subscription.subscription_status,
        billing_cycle: input.billingCycle,
      })
      .eq('id', subscription.id);
    if (workspaceUpdate.error) throw workspaceUpdate.error;
    const refreshed = await this.repository.getModuleSubscription(
      input.workspaceId,
      productModule.id,
    );
    const change = await this.client.from('subscription_changes').insert({
      workspace_module_subscription_id: refreshed!.id,
      workspace_id: input.workspaceId,
      change_type: changeType,
      from_plan_id: current?.plan_id ?? null,
      to_plan_id: plan.id,
      effective_at: now,
      status: 'applied',
      created_by: actorId,
      applied_at: now,
    });
    if (change.error) throw change.error;
    await this.recordEvent({
      workspaceId: input.workspaceId,
      eventType: changeType === 'module_add' ? 'module_added' : 'plan_upgraded',
      eventKey: `${changeType}:${refreshed!.id}:${plan.id}:${now}`,
      title:
        changeType === 'module_add'
          ? `${productModule.display_name} added`
          : `${productModule.display_name} upgraded to ${plan.plan_name}`,
      message:
        changeType === 'module_add'
          ? `${productModule.display_name} is active on the ${plan.plan_name} plan.`
          : 'The plan upgrade is active immediately and updated limits now apply.',
      email: false,
      metadata: { moduleKey: input.moduleKey, planKey: plan.plan_key, actorId },
    });
    return {
      workspaceId: input.workspaceId,
      moduleKey: input.moduleKey,
      fromPlanKey: currentPlan.plan_key ?? plan.plan_key,
      toPlanKey: plan.plan_key,
      planKey: plan.plan_key,
      effectiveAt: now,
      changeStatus: 'applied' as const,
    };
  }

  async downgrade(input: DowngradeSubscriptionRequest, actorId: string) {
    const productModule = await this.repository.getModule(input.moduleKey);
    const target = await this.repository.getPlan(input.newPlanKey);
    const current = await this.repository.getModuleSubscription(
      input.workspaceId,
      productModule.id,
    );
    if (!current) {
      throw new SubscriptionApiError(
        'Module subscription not found',
        404,
        'NOT_FOUND',
      );
    }
    const currentPlan = asObject(current.plans);
    if (
      getPlanChangeDirection(
        Number(currentPlan.display_order),
        target.display_order,
      ) !== 'downgrade'
    ) {
      throw new SubscriptionApiError(
        'The requested plan is not a downgrade',
        409,
        'CONFLICT',
      );
    }
    const subscription = await this.repository.getWorkspaceSubscription(
      input.workspaceId,
    );
    const effectiveAt =
      subscription?.current_period_end ?? new Date().toISOString();
    const price = await this.repository.getModulePrice(
      productModule.id,
      target.id,
    );
    const billing = await this.repository.getBillingSubscription(
      input.workspaceId,
    );
    if (billing) {
      const itemId = (
        asObject(billing.metadata).items as Record<string, string>
      )?.[input.moduleKey];
      if (!itemId) {
        throw new SubscriptionApiError(
          'The Stripe subscription item mapping is missing',
          409,
          'ENTITLEMENT_CONFIGURATION_ERROR',
        );
      }
      if (target.is_paid) {
        const providerPrice = await this.repository.getProviderPrice(
          price.id,
          subscription!.billing_cycle,
        );
        await this.provider.scheduleItemPrice({
          providerSubscriptionId: billing.provider_subscription_id,
          providerSubscriptionItemId: itemId,
          providerPriceId: providerPrice.provider_price_id!,
        });
      } else {
        await this.provider.scheduleItemRemoval({
          providerSubscriptionId: billing.provider_subscription_id,
          providerSubscriptionItemId: itemId,
        });
      }
    }
    await this.cancelPendingChange(current.id);
    const result = await this.client.from('subscription_changes').insert({
      workspace_module_subscription_id: current.id,
      workspace_id: input.workspaceId,
      change_type: 'plan_downgrade',
      from_plan_id: current.plan_id,
      to_plan_id: target.id,
      effective_at: effectiveAt,
      status: 'pending',
      created_by: actorId,
    });
    if (result.error) throw result.error;
    await this.recordEvent({
      workspaceId: input.workspaceId,
      eventType: 'plan_downgrade_scheduled',
      eventKey: `plan_downgrade_scheduled:${current.id}:${target.id}:${effectiveAt}`,
      title: `${productModule.display_name} downgrade scheduled`,
      message: `The ${target.plan_name} plan will take effect on ${new Date(effectiveAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}.`,
      email: true,
      metadata: {
        moduleKey: input.moduleKey,
        planKey: target.plan_key,
        actorId,
      },
    });
    return {
      workspaceId: input.workspaceId,
      moduleKey: input.moduleKey,
      fromPlanKey: currentPlan.plan_key,
      toPlanKey: target.plan_key,
      effectiveAt,
      changeStatus: 'pending' as const,
    };
  }

  async removeModule(
    workspaceId: string,
    moduleKey: SubscriptionModuleKey,
    actorId: string,
  ) {
    const productModule = await this.repository.getModule(moduleKey);
    const current = await this.repository.getModuleSubscription(
      workspaceId,
      productModule.id,
    );
    if (!current || current.status === 'cancelled') {
      throw new SubscriptionApiError(
        'Active module subscription not found',
        404,
        'NOT_FOUND',
      );
    }
    const subscription =
      await this.repository.getWorkspaceSubscription(workspaceId);
    const effectiveAt =
      subscription?.current_period_end ?? new Date().toISOString();
    const billing = await this.repository.getBillingSubscription(workspaceId);
    if (billing && asObject(current.plans).is_paid) {
      const itemId = (
        asObject(billing.metadata).items as Record<string, string>
      )?.[moduleKey];
      if (!itemId) {
        throw new SubscriptionApiError(
          'The Stripe subscription item mapping is missing',
          409,
          'ENTITLEMENT_CONFIGURATION_ERROR',
        );
      }
      await this.provider.scheduleItemRemoval({
        providerSubscriptionId: billing.provider_subscription_id,
        providerSubscriptionItemId: itemId,
      });
    }
    await this.cancelPendingChange(current.id);
    const result = await this.client.from('subscription_changes').insert({
      workspace_module_subscription_id: current.id,
      workspace_id: workspaceId,
      change_type: 'module_cancel',
      from_plan_id: current.plan_id,
      effective_at: effectiveAt,
      status: 'pending',
      created_by: actorId,
    });
    if (result.error) throw result.error;
    await this.recordEvent({
      workspaceId,
      eventType: 'module_removed',
      eventKey: `module_removal_scheduled:${current.id}:${effectiveAt}`,
      title: `${productModule.display_name} removal scheduled`,
      message: `The module remains active until ${new Date(effectiveAt).toLocaleDateString('en-US', { timeZone: 'UTC' })}.`,
      email: true,
      metadata: { moduleKey, actorId, scheduled: true },
    });
    return {
      workspaceId,
      moduleKey,
      planKey: asObject(current.plans).plan_key,
      effectiveAt,
      changeStatus: 'pending' as const,
    };
  }

  async getModuleUsers(workspaceId: string, moduleKey: SubscriptionModuleKey) {
    const productModule = await this.repository.getModule(moduleKey);
    const users = await this.repository.getModuleUsers(
      workspaceId,
      productModule.id,
    );
    return {
      workspaceId,
      moduleKey,
      users: users.map((row) => {
        const account = asObject(row.accounts);
        return {
          userId: row.user_id,
          name: account.name ?? null,
          email: account.email,
          pictureUrl: account.picture_url ?? null,
          status: row.status,
          assignedAt: row.assigned_at,
          removedAt: row.removed_at,
        };
      }),
    };
  }

  async assignModuleUser(input: AssignModuleUserRequest, actorId: string) {
    const productModule = await this.repository.getModule(input.moduleKey);
    const subscription = await this.repository.getModuleSubscription(
      input.workspaceId,
      productModule.id,
    );
    if (!subscription || !['active', 'trial'].includes(subscription.status)) {
      throw new SubscriptionApiError(
        'The module is not active',
        409,
        'CONFLICT',
      );
    }
    await this.repository.assertAcceptedWorkspaceMember(
      input.workspaceId,
      input.userId,
    );
    const result = await this.client.from('workspace_module_users').upsert(
      {
        workspace_id: input.workspaceId,
        module_id: productModule.id,
        user_id: input.userId,
        status: 'active',
        assigned_by: actorId,
        assigned_at: new Date().toISOString(),
        removed_at: null,
      },
      { onConflict: 'workspace_id,user_id,module_id' },
    );
    if (result.error) throw result.error;
    return { ...input, status: 'active' as const };
  }

  async removeModuleUser(input: AssignModuleUserRequest) {
    const productModule = await this.repository.getModule(input.moduleKey);
    const result = await this.client
      .from('workspace_module_users')
      .update({ status: 'removed', removed_at: new Date().toISOString() })
      .eq('workspace_id', input.workspaceId)
      .eq('module_id', productModule.id)
      .eq('user_id', input.userId)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) {
      throw new SubscriptionApiError(
        'Module user assignment not found',
        404,
        'NOT_FOUND',
      );
    }
    return { ...input, status: 'removed' as const };
  }

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

  private async getBillingQuantity(workspaceId: string, moduleId: string) {
    const counts = await this.repository.getModuleUserCount(workspaceId, [
      moduleId,
    ]);
    return Math.max(1, counts.get(moduleId) ?? 0);
  }

  private async cancelPendingChange(moduleSubscriptionId: string) {
    const result = await this.client
      .from('subscription_changes')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('workspace_module_subscription_id', moduleSubscriptionId)
      .eq('status', 'pending');
    if (result.error) throw result.error;
  }

  private async recordEvent(input: {
    workspaceId: string;
    eventType: SubscriptionNotificationEvent;
    eventKey: string;
    title: string;
    message: string;
    email: boolean;
    metadata?: Json;
  }) {
    await this.notifications.emitBestEffort({
      ...input,
      actionUrl: '/org/subscription',
    });
  }
}

export function createSubscriptionService(client: Client) {
  return new SubscriptionService(client);
}
