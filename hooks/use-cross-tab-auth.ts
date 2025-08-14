import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

export function useCrossTabAuthSync() {
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      // If new_user_login is set, another tab has a new user login
      if (e.key === "new_user_login" && e.newValue) {
        console.log("🔄 Cross-tab: New user login detected, forcing refresh");
        // Force a page refresh to clear the old user's session
        window.location.reload();
      }

      // If auth_token is removed, user logged out in another tab
      if (e.key === "auth_token" && e.oldValue && !e.newValue) {
        console.log("🔄 Cross-tab: Auth token removed, logging out");
        logout();
      }
    };

    // Listen for localStorage changes from other tabs
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [logout]);
}
