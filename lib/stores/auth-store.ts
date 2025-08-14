import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Organization } from "@/lib/types";

// Hydration-safe cookie helper functions for session management
const setCookie = (name: string, value: string, days: number = 7) => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
  } catch (error) {
    console.warn("Failed to set cookie during hydration:", error);
  }
};

const deleteCookie = (name: string) => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  try {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;SameSite=Lax`;
  } catch (error) {
    console.warn("Failed to delete cookie during hydration:", error);
  }
};

export interface User {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  // Setup questions (matching database column names)
  userRole?: string;
  teamSize?: string;
  companySize?: string;
  whatBringsYou?: string;
  accountName?: string;
}

export interface AuthState {
  // State
  user: User | null;
  token: string | null;
  currentOrganization: Organization | null;
  organizations: Organization[];
  currentWorkspace: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCurrentOrganization: (org: Organization | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateCurrentWorkspace: (workspace: any | null) => void;

  // Auth actions
  login: (
    user: User,
    token: string,
    organizations: Organization[],
    currentOrg?: Organization
  ) => void;
  logout: () => void;
  register: (user: User) => void;
  updateCurrentOrganization: (org: Organization) => void;

  // Computed
  getAuthHeaders: () => Record<string, string>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      currentOrganization: null,
      organizations: [],
      currentWorkspace: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setCurrentOrganization: (currentOrganization) =>
        set({ currentOrganization }),
      setOrganizations: (organizations) => set({ organizations }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      updateCurrentWorkspace: (workspace) =>
        set({ currentWorkspace: workspace }),

      // Auth actions
      login: (user, token, organizations, currentOrg) => {
        console.log("🔐 Auth Store: Login function called");
        console.log("🔐 Token length:", token.length, "bytes");

        // SOLUTION: Create a shorter session ID instead of storing full JWT in cookie
        const sessionId = `session_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        console.log("🔑 Generated session ID:", sessionId);

        // Store full token in localStorage (larger capacity) - hydration-safe
        if (
          typeof window !== "undefined" &&
          typeof localStorage !== "undefined"
        ) {
          try {
            localStorage.setItem("auth_token", token);
            localStorage.setItem("session_id", sessionId);
            console.log("💾 Stored full token in localStorage");
          } catch (error) {
            console.warn("Failed to store auth token in localStorage:", error);
          }
        }

        // Set both session ID and auth token in cookies for middleware
        setCookie("auth_session", sessionId, 7);
        setCookie("auth_token", "authenticated", 7); // Simple flag for middleware

        console.log("🍪 Set auth cookies for middleware");

        set({
          user,
          token,
          organizations,
          currentOrganization: currentOrg || organizations[0] || null,
          currentWorkspace: null,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });

        console.log("✅ Auth store state updated - isAuthenticated: true");
      },

      logout: () => {
        // Clear all auth cookies and localStorage
        deleteCookie("auth_session");
        deleteCookie("auth_token");

        if (
          typeof window !== "undefined" &&
          typeof localStorage !== "undefined"
        ) {
          try {
            localStorage.removeItem("auth_token");
            localStorage.removeItem("session_id");
          } catch (error) {
            console.warn("Failed to clear localStorage during logout:", error);
          }
        }

        set({
          user: null,
          token: null,
          currentOrganization: null,
          organizations: [],
          currentWorkspace: null,
          isAuthenticated: false,
          error: null,
        });
      },

      register: (user) =>
        set({
          user,
          isAuthenticated: false, // Not fully authenticated until organization is created
          error: null,
        }),

      updateCurrentOrganization: (org) => {
        // Clear workspace when organization changes
        try {
          if (
            typeof window !== "undefined" &&
            typeof localStorage !== "undefined"
          ) {
            localStorage.removeItem("current_workspace");
          }
        } catch {}
        set({
          currentOrganization: org,
          currentWorkspace: null,
        });
      },

      // Computed
      getAuthHeaders: () => {
        const { token } = get();
        return token
          ? { Authorization: `Bearer ${token}` }
          : ({} as Record<string, string>);
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => {
        // Hydration-safe localStorage implementation
        if (
          typeof window === "undefined" ||
          typeof localStorage === "undefined"
        ) {
          // Return a no-op storage during SSR
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        currentOrganization: state.currentOrganization,
        organizations: state.organizations,
        currentWorkspace: state.currentWorkspace,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isLoading = false;
          state.error = null;
        }
      },
      skipHydration: false,
    }
  )
);
