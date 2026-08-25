import 'server-only';

import type {
  PricingResponseData,
  SubscriptionModuleKey,
  UsageResponseData,
  WorkspacePlansResponseData,
} from './contracts';
import { SubscriptionApiError } from './errors';
import {
  SubscriptionServiceBase,
  asObject,
  toNumber,
} from './subscription-service-base';

export class SubscriptionQueryService extends SubscriptionServiceBase {
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
    const seatByModuleId = new Map(
      rows.seats.map((seat) => [seat.product_id, seat]),
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
        const seat = seatByModuleId.get(row.module_id);
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
          seatId: seat?.id ?? null,
          seatsPurchased: seat?.seats_purchased ?? 1,
          seatsUsed: seat?.seats_used ?? 0,
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
}
