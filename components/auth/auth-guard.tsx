"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireOrganization?: boolean;
}

export function AuthGuard({
  children,
  requireAuth = true,
  requireOrganization = false,
}: AuthGuardProps) {
  const { isAuthenticated, hasOrganization, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // Wait for auth state to load

    if (requireAuth && !isAuthenticated) {
      router.replace("/pages/welcome");
      return;
    }

    if (requireOrganization && !hasOrganization) {
      router.replace("/pages/welcome");
      return;
    }
  }, [
    isAuthenticated,
    hasOrganization,
    isLoading,
    requireAuth,
    requireOrganization,
    router,
  ]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render children if auth requirements not met
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  if (requireOrganization && !hasOrganization) {
    return null;
  }

  return <>{children}</>;
}
