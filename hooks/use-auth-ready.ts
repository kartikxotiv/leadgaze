"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthHydration } from "@/components/auth/auth-hydration-provider";

/**
 * Hook to check if auth store is fully hydrated and ready
 * This prevents data fetching before auth state is loaded from localStorage
 */
export function useAuthReady() {
  const { user, currentOrganization, token, isAuthenticated } = useAuthStore();
  const { isHydrated, isReady: hydrationReady } = useAuthHydration();

  return {
    isReady: hydrationReady && isHydrated,
    hasHydrated: isHydrated,
    isAuthenticated:
      hydrationReady && isHydrated && !!user && !!token && isAuthenticated,
    hasOrganization: hydrationReady && isHydrated && !!currentOrganization,
    organizationId: currentOrganization?.organizationId,
  };
}
