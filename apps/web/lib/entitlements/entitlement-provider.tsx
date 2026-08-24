'use client';

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { useQuery } from '@tanstack/react-query';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getEntitlementContextService } from '~/services/pricing-subscription.service';

import type {
  EntitlementContext,
  EntitlementFeature,
  EntitlementModuleKey,
} from './types';

type RawContext = Record<string, unknown>;

type EntitlementClientContext = {
  contexts: Partial<Record<EntitlementModuleKey, EntitlementContext>>;
  isLoading: boolean;
  getFeature: (
    moduleKey: EntitlementModuleKey,
    featureKey: string,
  ) => EntitlementFeature | null;
  hasFeature: (moduleKey: EntitlementModuleKey, featureKey: string) => boolean;
  canConsume: (
    moduleKey: EntitlementModuleKey,
    featureKey: string,
    quantity?: number,
  ) => boolean;
  isTrialActive: (moduleKey?: EntitlementModuleKey) => boolean;
  refresh: () => Promise<unknown>;
};

const EntitlementsContext = createContext<EntitlementClientContext | null>(
  null,
);

const normalizeContext = (raw: RawContext): EntitlementContext => {
  const rawPlan = (raw.plan ?? {}) as Record<string, unknown>;
  const rawFeatures = (raw.features ?? {}) as Record<
    string,
    Record<string, unknown>
  >;
  return {
    workspaceId: String(raw.workspace_id),
    moduleKey: String(raw.module_key) as EntitlementModuleKey,
    plan: {
      planKey: String(
        rawPlan.plan_key,
      ) as EntitlementContext['plan']['planKey'],
      planName: String(rawPlan.plan_name),
      subscriptionStatus: String(rawPlan.subscription_status),
      moduleStatus: String(rawPlan.module_status),
      billingCycle: rawPlan.billing_cycle as 'monthly' | 'yearly' | undefined,
      trialEndDate: (rawPlan.trial_end_date as string | null) ?? null,
      currentPeriodStart:
        (rawPlan.current_period_start as string | null) ?? null,
      currentPeriodEnd: (rawPlan.current_period_end as string | null) ?? null,
    },
    features: Object.fromEntries(
      Object.entries(rawFeatures).map(([featureKey, feature]) => [
        featureKey,
        {
          isEnabled: Boolean(feature.is_enabled),
          limitValue:
            typeof feature.limit_value === 'number'
              ? feature.limit_value
              : null,
          limitType: feature.limit_type as EntitlementFeature['limitType'],
          enumValue:
            typeof feature.enum_value === 'string' ? feature.enum_value : null,
          currentUsage: Number(feature.current_usage ?? 0),
          isNearLimit: Boolean(feature.is_near_limit),
          isAtLimit: Boolean(feature.is_at_limit),
          resolvedFromPlanKey:
            typeof feature.resolved_from_plan_key === 'string'
              ? feature.resolved_from_plan_key
              : null,
        },
      ]),
    ),
  };
};

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const { currentWorkspace, user } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  const query = useQuery({
    queryKey: ['entitlement-contexts', workspaceId],
    enabled: Boolean(workspaceId && user?.id),
    queryFn: async () => {
      const modules: EntitlementModuleKey[] = ['sales', 'service_cloud'];
      const results = await Promise.allSettled(
        modules.map((moduleKey) =>
          getEntitlementContextService(workspaceId!, moduleKey),
        ),
      );
      return Object.fromEntries(
        results.flatMap((result, index) =>
          result.status === 'fulfilled'
            ? [[modules[index], normalizeContext(result.value as RawContext)]]
            : [],
        ),
      ) as Partial<Record<EntitlementModuleKey, EntitlementContext>>;
    },
    staleTime: 60_000,
  });

  const contexts = useMemo(() => query.data ?? {}, [query.data]);
  const getFeature = useCallback(
    (moduleKey: EntitlementModuleKey, featureKey: string) =>
      contexts[moduleKey]?.features[featureKey] ?? null,
    [contexts],
  );
  const value = useMemo<EntitlementClientContext>(
    () => ({
      contexts,
      isLoading: query.isLoading,
      getFeature,
      hasFeature: (moduleKey, featureKey) =>
        Boolean(getFeature(moduleKey, featureKey)?.isEnabled),
      canConsume: (moduleKey, featureKey, quantity = 1) => {
        const feature = getFeature(moduleKey, featureKey);
        if (!feature?.isEnabled) return false;
        return (
          feature.limitValue === null ||
          feature.currentUsage + quantity <= feature.limitValue
        );
      },
      isTrialActive: (moduleKey) => {
        if (moduleKey) {
          return (
            contexts[moduleKey]?.plan.subscriptionStatus === 'trial_active'
          );
        }
        return Object.values(contexts).some(
          (context) => context?.plan.subscriptionStatus === 'trial_active',
        );
      },
      refresh: query.refetch,
    }),
    [contexts, getFeature, query.isLoading, query.refetch],
  );

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error('useEntitlements must be used inside EntitlementProvider');
  }
  return context;
}
