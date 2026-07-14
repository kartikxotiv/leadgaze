'use client';

import React, { ReactNode, createContext, useContext } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useUser } from '@kit/supabase/hooks/use-user';

import { getModuleKeyFromPath } from './route-module-map';

// Minimal shape from useUser() — JwtPayload augmented with id = sub
interface AuthUser {
  id: string;
  email?: string;
  [key: string]: unknown;
}

interface Permission {
  module: string;
  feature: string;
  access_level: 'none' | 'own' | 'team' | 'all';
  can_access: boolean;
  can_view_sensitive_data: boolean;
  can_override_owner: boolean;
}

interface WorkspaceRole {
  id: string;
  workspace_id: string;
  role_key: string;
  role_name: string;
  hierarchy_level: number;
  product_key?: string | null;
  permissions: Permission[];
}

interface Workspace {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  member_id: string;
  status: 'pending' | 'accepted' | 'inactive' | 'removed';
  // roles: Map of product_key -> role
  // For backwards compatibility, currentRole contains the role of the active module
  roles: Record<string, WorkspaceRole>;
  currentRole: WorkspaceRole;
  currentProductKey?: string | null;
  company_logo_url?: string | null;
  billing_country?: string | null;
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
}

const RBACContext = createContext<RBACContextType | undefined>(undefined);

export function RBACProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading: isUserLoading } = useUser();
  const supabase = useSupabase();
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

  // Fetch user's workspaces and permissions
  const {
    data: workspaces = [],
    isLoading: isWorkspacesLoading,
    error,
  } = useQuery({
    queryKey: ['userWorkspaces', user?.id, currentProductKey],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get workspace memberships with product_key and role_id
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select(
          `
          id,
          status,
          product_key,
          product_id,
          workspace_id(
            id,
            name,
            slug,
            owner_id,
            company_id,
            companies (
              logo_url,
              billing_country
            )
          ),
          role_id(
            id,
            role_key,
            role_name,
            hierarchy_level,
            role_permissions(
              module_feature_id,
              access_level,
              can_access,
              can_view_sensitive_data,
              can_override_owner,
              crm_module_features!module_feature_id (
                feature_key,
                crm_modules!module_id (
                  module_key
                )
              )
            )
          )
        `,
        )
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Group members by workspace_id and build roles map
      const workspacesMap = new Map<string, Workspace>();
      for (const member of members) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const workspace = member.workspace_id as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const role = member.role_id as any;
        
        if (!workspace || !role) continue;
        
        const productKey = member.product_key as string | null;
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const permissionsData = role.role_permissions || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const permissions: Permission[] = permissionsData.map((perm: any) => ({
          module: perm.crm_module_features?.crm_modules?.module_key || '',
          feature: perm.crm_module_features?.feature_key || '',
          access_level: perm.access_level,
          can_access: perm.can_access,
          can_view_sensitive_data: perm.can_view_sensitive_data,
          can_override_owner: perm.can_override_owner,
        }));

        const workspaceId = workspace.id;
        
        // If productKey is null/blank, it applies globally to all known products.
        const targetProductKeys = productKey 
          ? [productKey] 
          : ['sales', 'inventory', 'service_cloud', 'funds'];

        for (const pKey of targetProductKeys) {
          if (!workspacesMap.has(workspaceId)) {
            // First role for this workspace - create the base workspace
            const roles: Record<string, WorkspaceRole> = {};
            roles[pKey] = {
              id: role.id,
              workspace_id: role.workspace_id,
              role_key: role.role_key,
              role_name: role.role_name,
              hierarchy_level: role.hierarchy_level,
              product_key: productKey,
              permissions,
            };
            
            // Initialize workspace. currentRole will be the first module we see,
            // but will be updated as we process more roles or as the path changes
            workspacesMap.set(workspaceId, {
              id: workspace.id,
              owner_id: workspace.owner_id,
              name: workspace.name,
              slug: workspace.slug,
              member_id: member.id,
              status: member.status,
              roles,
              currentRole: roles[pKey],
              currentProductKey: currentProductKey || pKey,
              company_logo_url: workspace.companies?.logo_url || null,
              billing_country: workspace.companies?.billing_country || null,
            });
          } else {
            // Add additional role for this workspace
            const existingWorkspace = workspacesMap.get(workspaceId)!;
            
            // Only set if:
            // 1. We are setting a specific role (productKey is not null)
            // 2. OR the product role doesn't exist yet (setting a global fallback)
            const isSpecific = !!productKey;
            const alreadyHasRole = !!existingWorkspace.roles[pKey];
            
            if (isSpecific || !alreadyHasRole) {
              existingWorkspace.roles[pKey] = {
                id: role.id,
                workspace_id: role.workspace_id,
                role_key: role.role_key,
                role_name: role.role_name,
                hierarchy_level: role.hierarchy_level,
                product_key: productKey,
                permissions,
              };

              // If this productKey matches current selection, update currentRole
              if (pKey === currentProductKey) {
                existingWorkspace.currentRole = existingWorkspace.roles[pKey];
                existingWorkspace.currentProductKey = pKey;
              }
            }
          }
        }
      }

      // Post-process: Ensure each workspace's currentRole is properly set based on currentProductKey
      const workspacesArray = Array.from(workspacesMap.values());
      for (const workspace of workspacesArray) {
        // If we have a currentProductKey from the pathname and it exists in roles, use it
        if (currentProductKey && workspace.roles[currentProductKey]) {
          workspace.currentRole = workspace.roles[currentProductKey];
          workspace.currentProductKey = currentProductKey;
        } else if (!workspace.currentProductKey) {
          // Otherwise, pick the first available product as default
          const firstProductKey = Object.keys(workspace.roles)[0];
          if (firstProductKey && workspace.roles[firstProductKey]) {
            workspace.currentRole = workspace.roles[firstProductKey];
            workspace.currentProductKey = firstProductKey;
          }
        }
      }

      return workspacesArray;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000, // 30 s — explicit invalidation happens on sign-out / workspace switch
    refetchOnWindowFocus: false,
  });

  const isLoading = isUserLoading || isWorkspacesLoading;

  const currentWorkspaceIdFinal =
    currentWorkspaceId ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('currentWorkspaceId')
      : null);

  const currentWorkspace: Workspace | null =
    workspaces.find((w) => w.id === currentWorkspaceIdFinal) ??
    (workspaces.length === 1 ? workspaces[0] ?? null : null);

  // Sync back to state and localStorage if we picked a default
  React.useEffect(() => {
    if (currentWorkspace && currentWorkspace.id !== currentWorkspaceId) {
      setCurrentWorkspaceId(currentWorkspace.id);
      if (typeof window !== 'undefined' && !localStorage.getItem('currentWorkspaceId')) {
        localStorage.setItem('currentWorkspaceId', currentWorkspace.id);
      }
    }
  }, [currentWorkspace, currentWorkspaceId]);

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
        setCurrentWorkspaceId(null);
      }
    }
  }, [user?.id, isUserLoading]);

  // Redirect to workspace selector if they have multiple workspaces but haven't selected one
  React.useEffect(() => {
    if (isWorkspacesLoading || isUserLoading || !user?.id) return;

    const hasValidSelection = workspaces.some((w) => w.id === currentWorkspaceIdFinal);

    // If they have multiple workspaces and no valid selection, and are trying to access /home/... or /org/...
    if (
      workspaces.length > 1 &&
      !hasValidSelection &&
      (pathname?.startsWith('/home') || pathname?.startsWith('/org'))
    ) {
      router.push('/workspace-select');
    }
  }, [workspaces, user?.id, isUserLoading, isWorkspacesLoading, currentWorkspaceIdFinal, pathname, router]);

  React.useEffect(() => {
    if (currentWorkspace) {
      // Reserved for future workspace-change side effects
    }
  }, [currentWorkspace]);

  // Module switching - updates currentRole to the selected module's role
  const selectModule = (productKey: string) => {
    if (!currentWorkspace) return;

    const role = currentWorkspace.roles[productKey];
    if (role) {
      setCurrentProductKey(productKey);

      // Also update the currentWorkspace in place for the provider
      // This will be reflected in the context value
      localStorage.setItem('currentProductKey', productKey);
    }
  };

  const hasPermission = (
    module: string,
    feature: string,
    accessLevel?: 'own' | 'team' | 'all',
  ): boolean => {
    if (!currentWorkspace) return false;

    const permission = currentWorkspace.currentRole.permissions.find(
      (p) => p.module === module && p.feature === feature,
    );

    if (!permission) return false;
    if (!permission.can_access) return false;

    if (accessLevel && permission.access_level !== accessLevel) {
      return false;
    }

    return true;
  };

  const canAccess = (module: string, feature: string = 'view'): boolean => {
    if (!currentWorkspace) {
      return false;
    }

    // Owner or Admin role bypass
    const role = currentWorkspace.currentRole;
    if (
      currentWorkspace.owner_id === user?.id ||
      role.role_key === 'admin' ||
      (role.hierarchy_level ?? 0) >= 100
    ) {
      return true;
    }

    const permission = role.permissions.find(
      (p) => p.module === module && p.feature === feature,
    );

    const hasAccess = permission?.can_access ?? false;

    return hasAccess;
  };

  const selectWorkspace = (workspaceId: string) => {
    if (workspaces.find((w) => w.id === workspaceId)) {
      setCurrentWorkspaceId(workspaceId);
      localStorage.setItem('currentWorkspaceId', workspaceId);

      // Reset to default module when switching workspace
      setCurrentProductKey(null);
      localStorage.removeItem('currentProductKey');
    }
  };

  return (
    <RBACContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        user: user ? { ...user, id: (user as { id?: string; sub?: string }).id ?? (user as { sub?: string }).sub ?? '' } : user,
        selectWorkspace,
        selectModule,
        hasPermission,
        canAccess,
        isLoading,
        error: error as Error | null,
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

// Hook to fetch all workspace roles (for role-based field access)
export function useWorkspaceRoles() {
  const { currentWorkspace } = useRBAC();
  const supabase = useSupabase();

  return useQuery({
    queryKey: ['workspaceRoles', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from('workspace_roles')
        .select('id, role_key, role_name, hierarchy_level, is_system, is_active')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('hierarchy_level', { ascending: true });

      if (error) {
        console.error('Error fetching workspace roles:', error);
        throw error;
      }

      return data;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Fetch workspace roles scoped to a product (sales, service_cloud, hrms, etc.).
// Used for field-level access control selectors so only roles from the current
// product module are shown — not roles from other products in the workspace.
export function useModuleRoles(rawProductKey: string) {
  const productKey = rawProductKey === 'service-cloud' ? 'service_cloud' : rawProductKey;
  const { currentWorkspace } = useRBAC();
  const supabase = useSupabase();

  return useQuery({
    queryKey: ['productRoles', currentWorkspace?.id, productKey],
    queryFn: async () => {
      if (!currentWorkspace?.id || !productKey) return [];

      const { data, error } = await supabase
        .from('workspace_roles')
        .select('id, role_key, role_name, hierarchy_level, is_system, is_active, product_key')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .eq('product_key', productKey)
        .order('hierarchy_level', { ascending: true });

      if (error) {
        console.error('Error fetching product roles:', error);
        throw error;
      }

      return data ?? [];
    },
    enabled: !!currentWorkspace?.id && !!productKey,
    staleTime: 5 * 60 * 1000,
  });
}
