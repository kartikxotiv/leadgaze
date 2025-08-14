"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Hook to prevent navigation back to auth pages when user is authenticated
 * This provides additional client-side protection beyond middleware
 */
export function usePreventAuthBack() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Auth-related routes that should be blocked for authenticated users
    const blockedRoutes = [
      "/pages/welcome",
      "/pages/auth/sign-in",
      "/pages/auth/sign-up",
      "/pages/auth/forgot-password",
      "/pages/auth/reset-password",
    ];

    // Check if current path is a blocked route
    const isBlockedRoute = blockedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isBlockedRoute) {
      console.log("🚫 Preventing access to auth page while authenticated");
      router.replace("/pages/dashboard");
      return;
    }

    // Handle browser back/forward navigation
    const handlePopState = (event: PopStateEvent) => {
      // Get the current pathname after navigation
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const isNavigatingToBlockedRoute = blockedRoutes.some((route) =>
          currentPath.startsWith(route)
        );

        if (isNavigatingToBlockedRoute) {
          console.log("🚫 Blocking back navigation to auth page");
          // Push dashboard route to history and navigate
          window.history.pushState(null, "", "/pages/dashboard");
          router.replace("/pages/dashboard");
        }
      }, 0);
    };

    // Add event listener for browser navigation
    window.addEventListener("popstate", handlePopState);

    // Push current state to history to prevent direct back navigation
    if (pathname === "/pages/dashboard") {
      window.history.pushState(null, "", pathname);
    }

    // Cleanup
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isAuthenticated, pathname, router]);
}
