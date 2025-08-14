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
      if (typeof window !== "undefined") {
        // Add a slight delay to show loading state
        setTimeout(() => {
          window.location.href = "/pages/welcome";
        }, 300);
      }
      
      // Clear auth state after navigation starts
      setTimeout(() => {
        authLogout();
        setIsLoggingOut(false);
      }, 200);
      
    } catch (error) {
      console.error("Logout error:", error);
      setIsLoggingOut(false);
      // Fallback navigation
      if (typeof window !== "undefined") {
        window.location.href = "/pages/welcome";
      }
    }
  };

  return {
    logout,
    isLoggingOut,
  };
}
