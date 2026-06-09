'use client';

import { ReactNode, useEffect, useState } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import { CreditCard, Lock, ShoppingCart } from 'lucide-react';

import { Button } from '@kit/ui/button';

import { checkProductAccessService } from '~/services/subscription.service';

import { useRBAC } from './rbac-provider';
import { getModuleKeyFromPath } from './route-module-map';

interface SubscriptionGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * SubscriptionGuard — wraps module pages and checks if the user's
 * workspace has a valid subscription (or seat assignment) for the
 * product that matches the current route.
 *
 * Access flow:
 * 1. Extract product key from URL path via route-module-map
 * 2. Call /api/subscriptions/check-access (which uses user_has_product_access DB fn)
 * 3. If no access → show a "Subscribe to continue" screen
 */
export function SubscriptionGuard({
  children,
  fallback,
}: SubscriptionGuardProps) {
  const { currentWorkspace, isLoading: isRbacLoading } = useRBAC();
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const productKey = getModuleKeyFromPath(pathname);

  const {
    data: accessData,
    isLoading: isAccessLoading,
    error: accessError,
  } = useQuery({
    queryKey: ['subscription-access', currentWorkspace?.id, productKey],
    queryFn: async () => {
      if (!currentWorkspace?.id) return { hasAccess: false };
      const result = await checkProductAccessService(
        currentWorkspace.id,
        productKey,
      );
      return result?.data ?? { hasAccess: false };
    },
    enabled: !!currentWorkspace?.id && !!productKey,
    staleTime: 30_000, // Cache for 30s
    retry: 2,
  });

  // Log access errors for debugging
  if (accessError) {
    console.error(
      '[SubscriptionGuard] Access check failed for',
      productKey,
      'in workspace',
      currentWorkspace?.id,
      accessError,
    );
  }

  useEffect(() => {
    if (!isRbacLoading && !isAccessLoading) {
      setChecked(true);
    }
  }, [isRbacLoading, isAccessLoading]);

  // Still loading
  if (!checked) {
    return null;
  }

  const hasAccess = accessData?.hasAccess ?? false;

  if (hasAccess) {
    return <>{children}</>;
  }

  // If the access check API itself failed (network error, 431, etc.),
  // allow access through rather than blocking — the error was logged above.
  if (accessError) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-[#dddbda] bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#fce9e9]">
          <Lock className="h-7 w-7 text-[#c23934]" />
        </div>

        <h2 className="text-lg font-semibold text-[#1b2533]">
          Module Not Available
        </h2>

        <p className="mt-2 text-sm text-[#54698d]">
          Your workspace does not have an active subscription for{' '}
          <span className="font-medium capitalize">
            {productKey.replace(/_/g, ' ')}
          </span>
          , or you have not been assigned a seat.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <Button
            className="w-full bg-[#0176d3] text-white hover:bg-[#0161b0]"
            onClick={() => router.push('/org/subscription')}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Subscribe to this Module
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/org/home')}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Back to Module Selector
          </Button>
        </div>

        <p className="mt-4 text-xs text-[#706e6b]">
          Contact your workspace admin if you believe this is an error.
        </p>
      </div>
    </div>
  );
}
