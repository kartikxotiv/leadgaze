"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useSafeCookies } from "@/lib/utils/hydration";

/**
 * Simple component that syncs localStorage auth state with cookies
 * This ensures middleware can see authentication status after page refresh
 */
export function TokenSync() {
  const { isAuthenticated, user, token } = useAuthStore();
  const { setCookie } = useSafeCookies();

  useEffect(() => {
    // Only run on client
    if (typeof window === "undefined") return;

    // If authenticated but no cookies, restore them
    if (isAuthenticated && user && token) {
      const hasAuthCookie = document.cookie.includes("auth_token");
      if (!hasAuthCookie) {
        console.log("🔄 Syncing auth cookies from store");
        setCookie("auth_token", "authenticated", { expires: 7 });
        setCookie("auth_session", `session_${Date.now()}`, { expires: 7 });
      }
    }

    // If not authenticated, ensure cookies are cleared
    if (!isAuthenticated || !user || !token) {
      setCookie("auth_token", "", { expires: -1 });
      setCookie("auth_session", "", { expires: -1 });
    }
  }, [isAuthenticated, user, token, setCookie]);

  // This component renders nothing
  return null;
}
