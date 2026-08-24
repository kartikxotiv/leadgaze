import 'server-only';

import type {
  AddModuleRequest,
  DowngradeSubscriptionRequest,
  StartTrialRequest,
  SubscriptionModuleKey,
  UpgradeSubscriptionRequest,
} from './contracts';
import { SubscriptionApiError } from './errors';
import { SubscriptionQueryService } from './subscription-query-service';
import {
  getPlanChangeDirection,
  getTrialStartRejection,
} from './subscription-rules';
import { asObject } from './subscription-service-base';

export class SubscriptionChangeService extends SubscriptionQueryService {
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
}
