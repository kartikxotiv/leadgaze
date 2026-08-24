'use client';

import Link from 'next/link';

import { AlertTriangle, Ban } from 'lucide-react';

import { Button } from '@kit/ui/button';

import { useEntitlements } from '~/lib/entitlements/entitlement-provider';
import type { EntitlementModuleKey } from '~/lib/entitlements/types';

export function UsageLimitBanner({
  moduleKey,
  featureKey,
  label,
}: {
  moduleKey: EntitlementModuleKey;
  featureKey: string;
  label: string;
}) {
  const { contexts, getFeature } = useEntitlements();
  const feature = getFeature(moduleKey, featureKey);
  if (!feature || feature.limitValue === null || !feature.isNearLimit)
    return null;
  const atLimit = feature.isAtLimit;
  const planName = contexts[moduleKey]?.plan.planName ?? 'current';
  return (
    <div
      className={
        atLimit
          ? 'flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100'
          : 'flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'
      }
    >
      {atLimit ? (
        <Ban className="h-5 w-5" />
      ) : (
        <AlertTriangle className="h-5 w-5" />
      )}
      <p className="min-w-0 flex-1 text-sm">
        {atLimit
          ? `${label} limit reached. Existing ${label.toLowerCase()} remain accessible.`
          : `You've used ${feature.currentUsage} of ${feature.limitValue} ${label.toLowerCase()} on ${planName}.`}
      </p>
      <Button asChild size="sm">
        <Link href="/org/subscription">Upgrade now</Link>
      </Button>
    </div>
  );
}
