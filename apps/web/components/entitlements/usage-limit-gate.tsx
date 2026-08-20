'use client';

import type { ReactNode } from 'react';

import { useEntitlements } from '~/lib/entitlements/entitlement-provider';
import type { EntitlementModuleKey } from '~/lib/entitlements/types';

import { UpgradePrompt } from './upgrade-prompt';

export function UsageLimitGate({
  moduleKey,
  featureKey,
  quantity = 1,
  children,
  fallback,
}: {
  moduleKey: EntitlementModuleKey;
  featureKey: string;
  quantity?: number;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { canConsume, getFeature, isLoading } = useEntitlements();
  if (isLoading) return null;
  if (canConsume(moduleKey, featureKey, quantity)) return children;
  const feature = getFeature(moduleKey, featureKey);
  return (
    fallback ?? (
      <UpgradePrompt
        title="Usage limit reached"
        description={`You are using ${feature?.currentUsage ?? 0} of ${feature?.limitValue ?? 0}. Existing records remain accessible.`}
      />
    )
  );
}
