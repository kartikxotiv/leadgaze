import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Session Manager Utility
 * Provides consistent session management across the application
 */

export class SessionManager {
  /**
   * Check if the current session is valid
   */
  static isSessionValid(): boolean {
    const { isAuthenticated, token } = useAuthStore.getState();
    return isAuthenticated && !!token;
  }

  /**
   * Auto logout and redirect to sign-in page
   * @param delay - Delay in milliseconds before redirect (default: 1000ms)
   */
  static autoLogout(delay: number = 1000): void {
    const { logout } = useAuthStore.getState();

    // Clear auth state
    logout();

    // Redirect to sign-in page after delay
    setTimeout(() => {
      if (typeof window !== "undefined") {
        window.location.href = "/pages/auth/sign-in";
      }
    }, delay);
  }

  /**
   * Handle expired session scenarios
   * @param message - Custom message to show (optional)
   */
  static handleExpiredSession(message?: string): void {
    console.warn("Session expired:", message || "Token invalid or missing");
    this.autoLogout();
  }

  /**
   * Validate token and auto logout if invalid
   * @param token - Token to validate
   * @returns boolean indicating if token is valid
   */
  static validateTokenOrLogout(token: string | null): boolean {
    if (!token) {
      this.handleExpiredSession("No authorization token provided");
      return false;
    }
    return true;
  }

  /**
   * Check session validity and auto logout if expired
   * Returns true if session is valid, false if logged out
   */
  static checkSessionOrLogout(): boolean {
    if (!this.isSessionValid()) {
      this.handleExpiredSession("Session expired");
      return false;
    }
    return true;
  }
}

/**
 * React hook for session management
 */
export function useSessionManager() {
  return {
    isSessionValid: SessionManager.isSessionValid,
    autoLogout: SessionManager.autoLogout,
    handleExpiredSession: SessionManager.handleExpiredSession,
    validateTokenOrLogout: SessionManager.validateTokenOrLogout,
    checkSessionOrLogout: SessionManager.checkSessionOrLogout,
  };
}
