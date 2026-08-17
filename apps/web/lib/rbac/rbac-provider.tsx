'use client';

import React, { ReactNode, createContext, useContext } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { useUser } from '@kit/supabase/hooks/use-user';

import { getModuleKeyFromPath } from './route-module-map';
import { getRolesService } from '~/services/roles.service';
import {
  initializeWorkspaceSessionService,
  transformWorkspaceForLegacyRBAC,
  hasPermission,
  canAccessModule,
  type Workspace,
  type WorkspaceRole,
  type Permission,
} from '~/services/workspace-init.service';

// Minimal shape from useUser() — JwtPayload augmented with id = sub
interface AuthUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

interface RBACContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  user: AuthUser | null | undefined;
  selectWorkspace: (workspaceId: string) => void;
  selectModule: (productKey: string) => void;
  hasPermission: (
    module: string,
    feature: string,
    accessLevel?: 'own' | 'team' | 'all',
  ) => boolean;
  canAccess: (module: string, feature?: string) => boolean;
  isLoading: boolean;
  error: Error | null;
  isInitialized: boolean;
  reinitialize: () => void;
  userPreferences?: any;
  teamMembers: any[];
  allRoles: WorkspaceRole[];
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const [currentWorkspaceId, setCurrentWorkspaceId] = React.useState<
    string | null
  >(null);

  // Initialize currentProductKey from pathname on mount
  const pathProductKey = getModuleKeyFromPath(pathname);
  const [currentProductKey, setCurrentProductKey] = React.useState<
    string | null
  >(pathProductKey);

  // **OPTIMIZED: Single workspace initialization call replaces 15+ queries**
  const {
    data: initData,
    isLoading: isInitLoading,
    error: initError,
    refetch: reinitialize,
  } = useQuery({
    queryKey: ['workspace-init', user?.id, currentProductKey],
    queryFn: () => {
      const storedWorkspaceId = typeof window !== 'undefined'
        ? localStorage.getItem('currentWorkspaceId')
        : null;

      return initializeWorkspaceSessionService(
        currentWorkspaceId || storedWorkspaceId
      );
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Retry up to 2 times for network errors
      if (failureCount < 2) {
        console.warn(`[RBAC] Initialization retry ${failureCount + 1}:`, error);
        return true;
      }
      return false;
    },
  });

  const currentWorkspaceIdFinal =
    currentWorkspaceId ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('currentWorkspaceId')
      : null);

  // Transform workspace data for compatibility
  const { workspaces = [], currentWorkspace } = React.useMemo(() => {
    if (!initData?.user_workspaces) {
      return { workspaces: [], currentWorkspace: null };
    }

    // Handle product key switching within workspaces
    const workspacesWithUpdatedRole = initData.user_workspaces.map(workspace => {
      if (!workspace.roles || !currentProductKey) return workspace;

      const targetRole =
        workspace.roles[currentProductKey] ||
        workspace.roles['sales'] ||
        Object.values(workspace.roles)[0];

      if (targetRole) {
        return {
          ...workspace,
          currentRole: targetRole,
          currentProductKey,
        };
      }

      return workspace;
    });

    const transformed = transformWorkspaceForLegacyRBAC(
      workspacesWithUpdatedRole,
      currentWorkspaceIdFinal
    );

    if (transformed.currentWorkspace && initData.current_workspace?.localization) {
      transformed.currentWorkspace.localization = initData.current_workspace.localization;
    }

    return transformed;
  }, [initData, currentWorkspaceIdFinal, currentProductKey]);

  const isLoading = isUserLoading || isInitLoading;
  const isInitialized = !!initData && !isLoading && !initError;

  // Auto-select workspace if user has only one
  React.useEffect(() => {
    if (
      !isLoading &&
      !currentWorkspaceId &&
      workspaces.length === 1 &&
      initData?.user_preferences?.auto_selected_workspace
    ) {
      const autoSelectedWorkspace = workspaces[0];
      setCurrentWorkspaceId(autoSelectedWorkspace.id);

      if (typeof window !== 'undefined') {
        localStorage.setItem('currentWorkspaceId', autoSelectedWorkspace.id);
      }

      console.log('[RBAC] Auto-selected workspace:', autoSelectedWorkspace.name);
    }
  }, [isLoading, workspaces, currentWorkspaceId, initData]);

  // Sync pathname-derived product key to state
  React.useEffect(() => {
    if (pathProductKey && pathProductKey !== currentProductKey) {
      setCurrentProductKey(pathProductKey);
    }
  }, [pathProductKey, currentProductKey]);

  // Clear active workspace selection from localStorage on logout
  React.useEffect(() => {
    if (!isUserLoading && !user?.id) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentWorkspaceId');
        localStorage.removeItem('currentProductKey');
        setCurrentWorkspaceId(null);
        setCurrentProductKey(null);
      }
    }
  }, [user?.id, isUserLoading]);

  // Redirect to workspace selector if they have multiple workspaces but haven't selected one
  React.useEffect(() => {
    if (isLoading || !user?.id || !isInitialized) return;

    const hasValidSelection = workspaces.some((w) => w.id === currentWorkspaceIdFinal);

    // If they have multiple workspaces and no valid selection, and are trying to access /home/... or /org/...
    if (
      workspaces.length > 1 &&
      !hasValidSelection &&
      (pathname?.startsWith('/home') || pathname?.startsWith('/org'))
    ) {
      console.log('[RBAC] Redirecting to workspace selector - multiple workspaces, no selection');
      router.push('/workspace-select');
    }
  }, [workspaces, user?.id, isLoading, isInitialized, currentWorkspaceIdFinal, pathname, router]);

  React.useEffect(() => {
    if (currentWorkspace && initData) {
      console.log('[RBAC] Workspace context ready:', {
        workspace: currentWorkspace.name,
        role: currentWorkspace.currentRole?.role_name,
        product: currentWorkspace.currentProductKey,
        teamMembers: initData.current_workspace?.team_members?.length || 0,
      });
    }
  }, [currentWorkspace, initData]);

  // Module switching - updates currentRole to the selected module's role
  const selectModule = React.useCallback((productKey: string) => {
    if (!currentWorkspace) return;

    const role =
      currentWorkspace.roles[productKey] ||
      currentWorkspace.roles['sales'] ||
      Object.values(currentWorkspace.roles)[0];

    if (role) {
      setCurrentProductKey(productKey);

      if (typeof window !== 'undefined') {
        localStorage.setItem('currentProductKey', productKey);
      }

      console.log('[RBAC] Module switched:', productKey);
    }
  }, [currentWorkspace]);

  const hasPermissionCallback = React.useCallback((
    module: string,
    feature: string,
    accessLevel?: 'own' | 'team' | 'all',
  ): boolean => {
    if (!currentWorkspace) return false;
    return hasPermission(currentWorkspace, module, feature, accessLevel);
  }, [currentWorkspace]);

  const canAccessCallback = React.useCallback((
    module: string,
    feature: string = 'view'
  ): boolean => {
    if (!currentWorkspace || !user?.id) return false;
    return canAccessModule(currentWorkspace, user.id, module, feature);
  }, [currentWorkspace, user?.id]);

  const selectWorkspace = React.useCallback((workspaceId: string) => {
    if (workspaces.find((w) => w.id === workspaceId)) {
      setCurrentWorkspaceId(workspaceId);

      if (typeof window !== 'undefined') {
        localStorage.setItem('currentWorkspaceId', workspaceId);
        // Reset to default module when switching workspace
        localStorage.removeItem('currentProductKey');
      }

      setCurrentProductKey(null);
      console.log('[RBAC] Workspace selected:', workspaceId);
    }
  }, [workspaces]);

  // Log initialization performance and cache data
  React.useEffect(() => {
    if (isInitialized && initData?.session_metadata) {
      const initTime = Date.now() - (initData.session_metadata.initialized_at * 1000);
      console.log(`[RBAC] Initialization completed in ${initTime.toFixed(0)}ms`);

      // Cache workspace initialization data in sessionStorage for optimized hooks
      if (currentWorkspace?.id && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            `workspace-${currentWorkspace.id}-init`,
            JSON.stringify(initData)
          );
          console.log(`[RBAC] Cached initialization data for workspace ${currentWorkspace.id}`);
        } catch (error) {
          console.warn('[RBAC] Failed to cache initialization data:', error);
        }
      }
    }
  }, [isInitialized, initData, currentWorkspace?.id]);

  // Extract team members and all unique workspace roles from init data (in-memory)
  const teamMembers = React.useMemo(() => {
    return initData?.current_workspace?.team_members || [];
  }, [initData?.current_workspace?.team_members]);

  const allRoles = React.useMemo(() => {
    const rolesMap = new Map<string, WorkspaceRole>();

    // 1. Roles from user's workspace roles
    if (currentWorkspace?.roles) {
      Object.values(currentWorkspace.roles).forEach((role) => {
        if (role?.id) {
          rolesMap.set(role.id, role);
        }
      });
    }

    // 2. Roles from all team members in current workspace
    if (initData?.current_workspace?.team_members) {
      initData.current_workspace.team_members.forEach((member: any) => {
        if (member?.role?.id && !rolesMap.has(member.role.id)) {
          rolesMap.set(member.role.id, {
            id: member.role.id,
            workspace_id: currentWorkspace?.id || '',
            role_key: member.role.role_key,
            role_name: member.role.role_name,
            color: member.role.color || null,
            hierarchy_level: member.role.hierarchy_level || 0,
            product_key: member.role.product_key || null,
            is_system: false,
            permissions: [],
          });
        }
      });
    }

    return Array.from(rolesMap.values());
  }, [currentWorkspace?.roles, currentWorkspace?.id, initData?.current_workspace?.team_members]);

  return (
    <RBACContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        user: user ? { ...user, id: (user as { id?: string; sub?: string }).id ?? (user as { sub?: string }).sub ?? '' } : user,
        userPreferences: initData?.user_preferences,
        teamMembers,
        allRoles,
        selectWorkspace,
        selectModule,
        hasPermission: hasPermissionCallback,
        canAccess: canAccessCallback,
        isLoading,
        error: initError as Error | null,
        isInitialized,
        reinitialize,
      }}
    >
      {children}
    </RBACContext.Provider>
  );
}

export function useRBAC() {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error('useRBAC must be used within RBACProvider');
  }
  return context;
}

// Hook to fetch all workspace roles (cached with React Query with 5m staleTime)
export function useWorkspaceRoles() {
  const { currentWorkspace, allRoles } = useRBAC();

  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const res = await getRolesService(currentWorkspace.id);
      return res?.data || [];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache to reduce DB calls
    placeholderData: allRoles.length > 0 ? allRoles : undefined,
  });

  return {
    data: roles,
    isLoading,
    error,
  };
}

// Fetch workspace roles scoped to a product (sales, service_cloud, hrms, etc.).
// Used for field-level access control selectors so all roles from the current
// product module are shown with zero redundant DB calls.
export function useModuleRoles(rawProductKey: string) {
  const productKey = rawProductKey === 'service-cloud' ? 'service_cloud' : rawProductKey;
  const { currentWorkspace, allRoles } = useRBAC();

  const inMemoryModuleRoles = React.useMemo(() => {
    return allRoles.filter(
      (role) => role.product_key === productKey || role.product_key === null || !role.product_key
    );
  }, [allRoles, productKey]);

  const { data: roles = [], isLoading, error } = useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id, productKey],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const res = await getRolesService(currentWorkspace.id, productKey);
      return res?.data || [];
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache to reduce DB calls
    placeholderData: inMemoryModuleRoles.length > 0 ? inMemoryModuleRoles : undefined,
  });

  return {
    data: roles,
    isLoading,
    error,
  };
}
