"use client";

import { useEffect, useState, useCallback } from "react";


export function useIsClient() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
}


export function useSafeLocalStorage() {
  const isClient = useIsClient();

  const getItem = useCallback(
    (key: string): string | null => {
      if (!isClient || typeof window === "undefined") {
        return null;
      }

      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn(`Failed to get localStorage item ${key}:`, error);
        return null;
      }
    },
    [isClient]
  );

  const setItem = useCallback(
    (key: string, value: string): void => {
      if (!isClient || typeof window === "undefined") {
        return;
      }

      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn(`Failed to set localStorage item ${key}:`, error);
      }
    },
    [isClient]
  );

  const removeItem = useCallback(
    (key: string): void => {
      if (!isClient || typeof window === "undefined") {
        return;
      }

      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove localStorage item ${key}:`, error);
      }
    },
    [isClient]
  );

  return { getItem, setItem, removeItem, isAvailable: isClient };
}


export function useSafeCookies() {
  const isClient = useIsClient();

  const getCookie = useCallback(
    (name: string): string | null => {
      if (!isClient || typeof document === "undefined") {
        return null;
      }

      try {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          return parts.pop()?.split(";").shift() || null;
        }
        return null;
      } catch (error) {
        console.warn(`Failed to get cookie ${name}:`, error);
        return null;
      }
    },
    [isClient]
  );

  const setCookie = useCallback(
    (
      name: string,
      value: string,
      options: {
        expires?: Date;
        path?: string;
        domain?: string;
        secure?: boolean;
        sameSite?: "strict" | "lax" | "none";
      } = {}
    ): void => {
      if (!isClient || typeof document === "undefined") {
        return;
      }

      try {
        let cookieString = `${name}=${value}`;

        if (options.expires) {
          cookieString += `; expires=${options.expires.toUTCString()}`;
        }
        if (options.path) {
          cookieString += `; path=${options.path}`;
        }
        if (options.domain) {
          cookieString += `; domain=${options.domain}`;
        }
        if (options.secure) {
          cookieString += `; secure`;
        }
        if (options.sameSite) {
          cookieString += `; samesite=${options.sameSite}`;
        }

        document.cookie = cookieString;
      } catch (error) {
        console.warn(`Failed to set cookie ${name}:`, error);
      }
    },
    [isClient]
  );

  return { getCookie, setCookie, isAvailable: isClient };
}


export function useSafeWindow() {
  const isClient = useIsClient();

  return {
    window: isClient ? window : undefined,
    isAvailable: isClient,
  };
}


export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isClient = useIsClient();

  return <>{isClient ? children : fallback}</>;
}


export function withHydrationSafety<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: React.ReactNode
) {
  return function HydrationSafeComponent(props: T) {
    return (
      <ClientOnly fallback={fallback}>
        <Component {...props} />
      </ClientOnly>
    );
  };
}
