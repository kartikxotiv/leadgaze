"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { useAuthHydration } from "@/components/auth/auth-hydration-provider";


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
