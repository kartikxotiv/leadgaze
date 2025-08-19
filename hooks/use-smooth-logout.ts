"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Custom hook for smooth logout experience
 * Prevents flash of empty content during logout transition
 */
export function useSmoothLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout: authLogout } = useAuthStore();

  const logout = () => {
    // Set logging out state
    setIsLoggingOut(true);

    // Start logout process
    try {
      // Immediate navigation to prevent flash of empty content

      // Clear auth state after navigation starts
      setTimeout(() => {
        authLogout();

        window.location.href = "/pages/welcome";
      }, 200);
    } catch (error) {
      console.error("Logout error:", error);

      // Fallback navigation
      if (typeof window !== "undefined") {
        window.location.href = "/pages/welcome";
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    logout,
    isLoggingOut,
  };
}
