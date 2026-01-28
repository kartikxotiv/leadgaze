'use client';

import React, { ReactNode, createContext, useContext } from 'react';

import { useQuery } from '@tanstack/react-query';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';

import { Tables } from '~/lib/database.types';

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
  permissions: Permission[];
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  member_id: string;
  role: WorkspaceRole;
  status: 'pending' | 'accepted' | 'inactive' | 'removed';
}

interface RBACContextType {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  selectWorkspace: (workspaceId: string) => void;
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
  const { data: user, isPending } = useUser();
  const [currentWorkspaceId, setCurrentWorkspaceId] = React.useState<
    string | null
  >(null);

  // Fetch user's workspaces and permissions
  const {
    data: workspaces = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['userWorkspaces', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const supabase = getSupabaseBrowserClient();

      // Get workspace memberships
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select(
          `
          id,
          workspace_id,
          status,
          workspace_id(*),
          role_id(id, role_key, role_name, hierarchy_level)
        `,
        )
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Get permissions for each role
      const workspacesData: Workspace[] = await Promise.all(
        members.map(async (member) => {
          const workspace = member.workspace_id as any;
          const role = member.role_id as any;

          // Get role permissions
          const { data: permissionsData, error: permError } = await supabase
            .from('role_permissions')
            .select(
              `
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
            `,
            )
            .eq('role_id', role.id);

          if (permError) throw permError;

          const permissions: Permission[] = (permissionsData || []).map(
            (perm: any) => ({
              module: perm.crm_module_features?.crm_modules?.module_key || '',
              feature: perm.crm_module_features?.feature_key || '',
              access_level: perm.access_level,
              can_access: perm.can_access,
              can_view_sensitive_data: perm.can_view_sensitive_data,
              can_override_owner: perm.can_override_owner,
            }),
          );

          return {
            id: workspace.id,
            name: workspace.name,
            slug: workspace.slug,
            member_id: member.id,
            status: member.status,
            role: {
              id: role.id,
              workspace_id: role.workspace_id,
              role_key: role.role_key,
              role_name: role.role_name,
              hierarchy_level: role.hierarchy_level,
              permissions,
            },
          };
        }),
      );

      return workspacesData;
    },
    enabled: !!user?.id,
    staleTime: 0, // Always consider data stale, refetch on invalidation
    gcTime: 0, // Don't cache data in garbage collection
  });

  // Set default workspace (first one or from localStorage)
  React.useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspaceId) {
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      const workspace =
        workspaces.find((w) => w.id === savedWorkspaceId) || workspaces[0];

      setCurrentWorkspaceId(workspace?.id!);
    }
  }, [workspaces, currentWorkspaceId]);

  const currentWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceId) || null;

  React.useEffect(() => {
    if (currentWorkspace) {
    }
  }, [currentWorkspace]);

  const hasPermission = (
    module: string,
    feature: string,
    accessLevel?: 'own' | 'team' | 'all',
  ): boolean => {
    if (!currentWorkspace) return false;

    const permission = currentWorkspace.role.permissions.find(
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

    const permission = currentWorkspace.role.permissions.find(
      (p) => p.module === module && p.feature === feature,
    );

    const hasAccess = permission?.can_access ?? false;

    return hasAccess;
  };

  const selectWorkspace = (workspaceId: string) => {
    if (workspaces.find((w) => w.id === workspaceId)) {
      setCurrentWorkspaceId(workspaceId);
      localStorage.setItem('currentWorkspaceId', workspaceId);
    }
  };

  return (
    <RBACContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        selectWorkspace,
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
