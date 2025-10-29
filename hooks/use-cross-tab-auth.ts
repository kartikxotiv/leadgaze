import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

export function useCrossTabAuthSync() {
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
     
      if (e.key === "new_user_login" && e.newValue) {
        console.log("🔄 Cross-tab: New user login detected, forcing refresh");
       
        window.location.reload();
      }

     
      if (e.key === "auth_token" && e.oldValue && !e.newValue) {
        console.log("🔄 Cross-tab: Auth token removed, logging out");
        logout();
      }
    };

   
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [logout]);
}
