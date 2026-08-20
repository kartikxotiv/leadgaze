'use client';

import type { ReactNode } from 'react';

import { useEntitlements } from '~/lib/entitlements/entitlement-provider';
import type { EntitlementModuleKey } from '~/lib/entitlements/types';

import { UpgradePrompt } from './upgrade-prompt';

export function EntitlementGate({
  moduleKey,
  featureKey,
  children,
  fallback,
  recommendedPlan,
}: {
  moduleKey: EntitlementModuleKey;
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  recommendedPlan?: string;
}) {
  const { hasFeature, isLoading } = useEntitlements();
  if (isLoading) return null;
  if (hasFeature(moduleKey, featureKey)) return children;
  return (
    fallback ?? (
      <UpgradePrompt
        recommendedPlan={recommendedPlan}
        description="Your current plan does not include this feature."
      />
    )
  );
}
