import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Organization } from "@/lib/types";

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
 
  userRole?: string;
  teamSize?: string;
  companySize?: string;
  whatBringsYou?: string;
  accountName?: string;
}

export interface AuthState {
 
  user: User | null;
  token: string | null;
  currentOrganization: Organization | null;
  organizations: Organization[];
  currentWorkspace: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

 
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setCurrentOrganization: (org: Organization | null) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateCurrentWorkspace: (workspace: any | null) => void;

 
  login: (
    user: User,
    token: string,
    organizations: Organization[],
    currentOrg?: Organization
  ) => void;
  logout: () => void;
  register: (user: User) => void;
  updateCurrentOrganization: (org: Organization) => void;

 
  getAuthHeaders: () => Record<string, string>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
     
      user: null,
      token: null,
      currentOrganization: null,
      organizations: [],
      currentWorkspace: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

     
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      setCurrentOrganization: (currentOrganization) =>
        set({ currentOrganization }),
      setOrganizations: (organizations) => set({ organizations }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      updateCurrentWorkspace: (workspace) =>
        set({ currentWorkspace: workspace }),

     
      login: (user, token, organizations, currentOrg) => {
        console.log("🔐 Auth Store: Login function called");
        console.log("🔐 Token length:", token.length, "bytes");

       
        const sessionId = `session_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        console.log("🔑 Generated session ID:", sessionId);

       
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

       
        setCookie("auth_session", sessionId, 7);
        setCookie("auth_token", "authenticated", 7);

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
          isAuthenticated: false,
          error: null,
        }),

      updateCurrentOrganization: (org) => {
       
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
       
        if (
          typeof window === "undefined" ||
          typeof localStorage === "undefined"
        ) {
         
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
