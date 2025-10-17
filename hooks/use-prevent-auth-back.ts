"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";


export function usePreventAuthBack() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) return;

   
    const blockedRoutes = [
      "/pages/welcome",
      "/pages/auth/sign-in",
      "/pages/auth/sign-up",
      "/pages/auth/forgot-password",
      "/pages/auth/reset-password",
    ];

   
    const isBlockedRoute = blockedRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isBlockedRoute) {
      console.log("🚫 Preventing access to auth page while authenticated");
      router.replace("/pages/dashboard");
      return;
    }

   
    const handlePopState = (event: PopStateEvent) => {
     
      setTimeout(() => {
        const currentPath = window.location.pathname;
        const isNavigatingToBlockedRoute = blockedRoutes.some((route) =>
          currentPath.startsWith(route)
        );

        if (isNavigatingToBlockedRoute) {
          console.log("🚫 Blocking back navigation to auth page");
         
          window.history.pushState(null, "", "/pages/dashboard");
          router.replace("/pages/dashboard");
        }
      }, 0);
    };

   
    window.addEventListener("popstate", handlePopState);

   
    if (pathname === "/pages/dashboard") {
      window.history.pushState(null, "", pathname);
    }

   
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isAuthenticated, pathname, router]);
}
