import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";

const autoLogoutAndRedirect = (authStore: any, delay: number = 1000) => {
 
  if (authStore.isLoading) return;

  authStore.logout();
  setTimeout(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/pages/auth/sign-in";
    }
  }, delay);
};

function useClientOnlyAuth() {
  const authStore = useAuthStore();

 
  return {
    ...authStore,
    isLoggedIn: authStore.isAuthenticated && !!authStore.token,
    hasOrganization: !!authStore.currentOrganization,
    switchOrganization: (organizationId: string) => {
      if (!authStore.token) {
       
        autoLogoutAndRedirect(authStore);
        throw new Error("No authorization token provided");
      }
      return switchOrganization(organizationId, authStore.token)
        .then((data) => {
          authStore.login(
            data.user,
            data.token,
            data.organizations,
            data.currentOrganization
          );
        })
        .catch((error) => {
         
          if (
            error.message.includes("Invalid token") ||
            error.message.includes("token")
          ) {
            autoLogoutAndRedirect(authStore);
          }
          throw error;
        });
    },
    autoLogout: () => autoLogoutAndRedirect(authStore),
  };
}

const registerUser = async (userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  organizationName: string;
  setupQuestions?: any;
}) => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(userData),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Registration failed");
  }

  return data;
};

const loginUser = async (credentials: { email: string; password: string }) => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credentials),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Login failed");
  }

  return data;
};

const switchOrganization = async (organizationId: string, token: string) => {
  const response = await fetch("/api/auth/switch-organization", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ organizationId }),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Failed to switch organization");
  }

  return data;
};

const createOrganization = async (organizationData: {
  userId: string;
  name: string;
  description?: string;
  industryType?: string;
  companySize?: string;
  primaryUseCase?: string;
  currentTool?: string;
}) => {
  const response = await fetch("/api/auth/organization", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(organizationData),
  });

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Organization creation failed");
  }

  return data;
};

export const useRegister = () => {
  const { login, setLoading, setError } = useClientOnlyAuth();

  return useMutation({
    mutationFn: registerUser,
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      const userData = {
        userId: data.user.userId,
        email: data.user.email,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
      };

      const organizations = (data.organizations || []).map((org: any) => ({
        organizationId: org.organizationId || org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        industryType: org.industryType,
        companySize: org.companySize,
        primaryUseCase: org.primaryUseCase,
        currentTool: org.currentTool,
        subscriptionStatus: org.subscriptionStatus || org.subscription_status,
        planType: org.planType || org.plan_type,
        trialStartsAt: org.trialStartsAt || org.trial_starts_at,
        trialEndsAt: org.trialEndsAt || org.trial_ends_at,
      }));

      const currentOrg = data.currentOrganization
        ? {
            organizationId:
              data.currentOrganization.organizationId ||
              data.currentOrganization.id,
            name: data.currentOrganization.name,
            slug: data.currentOrganization.slug,
            description: data.currentOrganization.description,
            industryType: data.currentOrganization.industryType,
            companySize: data.currentOrganization.companySize,
            primaryUseCase: data.currentOrganization.primaryUseCase,
            currentTool: data.currentOrganization.currentTool,
            subscriptionStatus:
              data.currentOrganization.subscriptionStatus ||
              data.currentOrganization.subscription_status,
            planType:
              data.currentOrganization.planType ||
              data.currentOrganization.plan_type,
            trialStartsAt:
              data.currentOrganization.trialStartsAt ||
              data.currentOrganization.trial_starts_at,
            trialEndsAt:
              data.currentOrganization.trialEndsAt ||
              data.currentOrganization.trial_ends_at,
            maxUsers: data.currentOrganization.maxUsers || 5,
            maxWorkspaces: data.currentOrganization.maxWorkspaces || 3,
          }
        : undefined;

      login(userData, data.token, organizations, currentOrg);
      setLoading(false);
    },
    onError: (error: Error) => {
      setError(error.message);
      setLoading(false);
    },
  });
};

export const useLogin = () => {
  const { login, setLoading, setError } = useClientOnlyAuth();

  return useMutation({
    mutationFn: loginUser,
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (response) => {
      const userData = {
        userId: response.user.userId,
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
      };

      const organizations = (response.organizations || []).map((org: any) => ({
        id: org.id || org.organizationId,
        organizationId: org.organizationId || org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        industryType: org.industryType,
        companySize: org.companySize,
        primaryUseCase: org.primaryUseCase,
        currentTool: org.currentTool,
        subscriptionStatus: org.subscriptionStatus,
        planType: org.planType,
        trialStartsAt: org.trialStartsAt,
        trialEndsAt: org.trialEndsAt,
        role: org.role,
        roleDisplayName: org.roleDisplayName,
        permissions: org.permissions || {},
        maxUsers: org.maxUsers || 5,
        maxWorkspaces: org.maxWorkspaces || 3,
        trialDaysRemaining: org.trialDaysRemaining,
      }));

      const currentOrg = response.currentOrganization
        ? {
            id:
              response.currentOrganization.id ||
              response.currentOrganization.organizationId,
            organizationId:
              response.currentOrganization.organizationId ||
              response.currentOrganization.id,
            name: response.currentOrganization.name,
            slug: response.currentOrganization.slug,
            description: response.currentOrganization.description,
            industryType: response.currentOrganization.industryType,
            companySize: response.currentOrganization.companySize,
            primaryUseCase: response.currentOrganization.primaryUseCase,
            currentTool: response.currentOrganization.currentTool,
            subscriptionStatus: response.currentOrganization.subscriptionStatus,
            planType: response.currentOrganization.planType,
            trialStartsAt: response.currentOrganization.trialStartsAt,
            trialEndsAt: response.currentOrganization.trialEndsAt,
            role: response.currentOrganization.role,
            roleDisplayName: response.currentOrganization.roleDisplayName,
            permissions: response.currentOrganization.permissions || {},
            maxUsers: response.currentOrganization.maxUsers || 5,
            maxWorkspaces: response.currentOrganization.maxWorkspaces || 3,
            trialDaysRemaining: response.currentOrganization.trialDaysRemaining,
          }
        : undefined;

      login(userData, response.token, organizations, currentOrg);
      setLoading(false);
    },
    onError: (error: Error) => {
      setError(error.message);
      setLoading(false);
    },
  });
};

export const useCreateOrganization = () => {
  const { login, setLoading, setError } = useClientOnlyAuth();

  return useMutation({
    mutationFn: createOrganization,
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      const currentUser = useAuthStore.getState().user;
      const currentOrganizations = useAuthStore.getState().organizations;
      if (!currentUser) {
        setError("No user data found");
        setLoading(false);
        return;
      }

      const newOrganization = {
        id: data.organization.organizationId,
        organizationId: data.organization.organizationId,
        name: data.organization.name,
        slug: data.organization.slug,
        description: data.organization.description,
        industryType: data.organization.industryType,
        companySize: data.organization.companySize,
        primaryUseCase: data.organization.primaryUseCase,
        currentTool: data.organization.currentTool,
        subscriptionStatus: data.organization.subscriptionStatus,
        planType: data.organization.planType,
        trialStartsAt: data.organization.trialStartsAt,
        trialEndsAt: data.organization.trialEndsAt,
        maxUsers: data.organization.maxUsers || 5,
        maxWorkspaces: data.organization.maxWorkspaces || 3,
        trialDaysRemaining: data.organization.trialDaysRemaining || 14,
        role: "owner",
        roleDisplayName: "Owner",
        permissions: {
          can_export_data: true,
          can_invite_users: true,
          can_remove_users: true,
          can_view_reports: true,
          can_edit_all_data: true,
          can_view_all_data: true,
          can_delete_all_data: true,
          can_change_user_roles: true,
          can_create_workspaces: true,
          can_delete_workspaces: true,
          can_manage_workspaces: true,
          can_delete_organization: true,
          can_manage_organization: true,
          can_manage_subscription: true,
        },
      };

      const updatedOrganizations = [...currentOrganizations, newOrganization];
      login(
        currentUser,
        data.token || "",
        updatedOrganizations,
        newOrganization
      );
      setLoading(false);
    },
    onError: (error: Error) => {
      setError(error.message);
      setLoading(false);
    },
  });
};

export const useAuth = () => {
  return useClientOnlyAuth();
};
