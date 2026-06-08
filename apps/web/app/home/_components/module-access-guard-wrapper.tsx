'use client';

import type { ReactNode } from 'react';

import { SubscriptionGuard } from '~/lib/rbac/subscription-guard';

/**
 * ModuleAccessGuardWrapper
 *
 * Wraps module pages with both:
 * 1. SubscriptionGuard — checks if workspace has a valid subscription for this product
 * 2. (RBAC permission checks are handled at the page level via ModuleGuard)
 *
 * The subscription guard uses the route-module-map to determine which product
 * to check based on the current URL path.
 */
export function ModuleAccessGuardWrapper({
  children,
  moduleKey,
}: {
  children: ReactNode;
  moduleKey: string;
}) {
  return <SubscriptionGuard>{children}</SubscriptionGuard>;
}
