import { useAuthStore } from "@/lib/stores/auth-store";



export class SessionManager {
  
  static isSessionValid(): boolean {
    const { isAuthenticated, token } = useAuthStore.getState();
    return isAuthenticated && !!token;
  }

  
  static autoLogout(delay: number = 1000): void {
    const { logout } = useAuthStore.getState();

   
    logout();

   
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.href = "/pages/auth/sign-in";
      }
    }, delay);
  }

  
  static handleExpiredSession(message?: string): void {
    console.warn("Session expired:", message || "Token invalid or missing");
    this.autoLogout();
  }

  
  static validateTokenOrLogout(token: string | null): boolean {
    if (!token) {
      this.handleExpiredSession("No authorization token provided");
      return false;
    }
    return true;
  }

  
  static checkSessionOrLogout(): boolean {
    if (!this.isSessionValid()) {
      this.handleExpiredSession("Session expired");
      return false;
    }
    return true;
  }
}


export function useSessionManager() {
  return {
    isSessionValid: SessionManager.isSessionValid,
    autoLogout: SessionManager.autoLogout,
    handleExpiredSession: SessionManager.handleExpiredSession,
    validateTokenOrLogout: SessionManager.validateTokenOrLogout,
    checkSessionOrLogout: SessionManager.checkSessionOrLogout,
  };
}
