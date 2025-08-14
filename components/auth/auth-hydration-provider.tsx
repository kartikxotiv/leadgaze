"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useCrossTabAuthSync } from "@/hooks/use-cross-tab-auth";

interface AuthHydrationContextType {
  isHydrated: boolean;
  isReady: boolean;
}

const AuthHydrationContext = createContext<AuthHydrationContextType>({
  isHydrated: false,
  isReady: false,
});

interface AuthHydrationProviderProps {
  children: React.ReactNode;
}

export function AuthHydrationProvider({
  children,
}: AuthHydrationProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const { user, token, isAuthenticated } = useAuthStore();

  // Enable cross-tab auth synchronization
  useCrossTabAuthSync();

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Check if we have localStorage data that suggests authentication
    const hasLocalStorageAuth = (() => {
      try {
        const storedToken = localStorage.getItem("auth_token");
        const storedAuthStorage = localStorage.getItem("auth-storage");
        return !!(storedToken && storedAuthStorage);
      } catch {
        return false;
      }
    })();

    console.log("🔄 AuthHydrationProvider: Checking auth state");
    console.log("📦 Has localStorage auth:", hasLocalStorageAuth);
    console.log("🔐 Current store state:", {
      hasUser: !!user,
      hasToken: !!token,
      isAuthenticated,
    });

    // If we have localStorage data but store isn't hydrated yet, wait
    if (hasLocalStorageAuth && !isAuthenticated) {
      console.log("⏳ Waiting for Zustand to hydrate from localStorage...");

      // Give Zustand time to rehydrate
      const timer = setTimeout(() => {
        setIsHydrated(true);
        setIsReady(true);

        // Ensure cookies are synced after hydration
        syncAuthCookies();
      }, 50); // Reduced delay for faster hydration

      return () => clearTimeout(timer);
    }

    // If no localStorage data or already authenticated, we're ready
    setIsHydrated(true);
    setIsReady(true);

    // Sync cookies if authenticated
    if (isAuthenticated) {
      syncAuthCookies();
    }
  }, [user, token, isAuthenticated]);

  const syncAuthCookies = () => {
    if (typeof document === "undefined") return;

    try {
      const authStore = useAuthStore.getState();

      if (authStore.isAuthenticated && authStore.user && authStore.token) {
        console.log("🍪 Syncing authentication cookies");

        // Create a session ID
        const sessionId = `session_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        // Set cookies that match what middleware expects
        const expires = new Date();
        expires.setTime(expires.getTime() + 7 * 24 * 60 * 60 * 1000);

        document.cookie = `auth_token=authenticated;expires=${expires.toUTCString()};path=/;SameSite=Lax`;
        document.cookie = `auth_session=${sessionId};expires=${expires.toUTCString()};path=/;SameSite=Lax`;

        console.log("✅ Auth cookies synced successfully");
      } else {
        console.log("🧹 Clearing auth cookies (not authenticated)");

        // Clear cookies
        document.cookie =
          "auth_token=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax";
        document.cookie =
          "auth_session=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax";
      }
    } catch (error) {
      console.warn("Failed to sync auth cookies:", error);
    }
  };

  // Show loading state until hydration is complete
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthHydrationContext.Provider value={{ isHydrated, isReady }}>
      {children}
    </AuthHydrationContext.Provider>
  );
}

export function useAuthHydration() {
  const context = useContext(AuthHydrationContext);
  if (!context) {
    throw new Error(
      "useAuthHydration must be used within AuthHydrationProvider"
    );
  }
  return context;
}
