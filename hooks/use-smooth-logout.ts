"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";


export function useSmoothLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { logout: authLogout } = useAuthStore();

  const logout = () => {
   
    setIsLoggingOut(true);

   
    try {
     

     
      setTimeout(() => {
        authLogout();

        window.location.href = "/pages/auth/sign-in";
      }, 200);
    } catch (error) {
      console.error("Logout error:", error);

     
      if (typeof window !== "undefined") {
        window.location.href = "/pages/auth/sign-in";
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
