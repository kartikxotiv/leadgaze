'use client';

import React, { ReactNode, createContext, useContext } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useUser } from '@kit/supabase/hooks/use-user';

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
  owner_id: string;
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
  const { data: user, isLoading: isUserLoading } = useUser();
  const supabase = useSupabase();
  const [currentWorkspaceId, setCurrentWorkspaceId] = React.useState<
    string | null
  >(null);

  // Fetch user's workspaces and permissions
  const {
    data: workspaces = [],
    isLoading: isWorkspacesLoading,
    error,
  } = useQuery({
    queryKey: ['userWorkspaces', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get workspace memberships, roles, and all nested role permissions in a single call
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select(
          `
          id,
          workspace_id,
          status,
          workspace_id(*),
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const workspacesData: Workspace[] = members.map((member) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const workspace = member.workspace_id as any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const role = member.role_id as any;
        const permissionsData = role?.role_permissions || [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const permissions: Permission[] = permissionsData.map((perm: any) => ({
          module: perm.crm_module_features?.crm_modules?.module_key || '',
          feature: perm.crm_module_features?.feature_key || '',
          access_level: perm.access_level,
          can_access: perm.can_access,
          can_view_sensitive_data: perm.can_view_sensitive_data,
          can_override_owner: perm.can_override_owner,
        }));

        return {
          id: workspace.id,
          owner_id: workspace.owner_id,
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
      });

      return workspacesData;
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const isLoading = isUserLoading || isWorkspacesLoading;

  const currentWorkspaceIdFinal =
    currentWorkspaceId ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('currentWorkspaceId')
      : null);

  const currentWorkspace =
    workspaces.find((w) => w.id === currentWorkspaceIdFinal) ||
    workspaces[0] ||
    null;

  // Sync back to state if we picked a default
  React.useEffect(() => {
    if (currentWorkspace && currentWorkspace.id !== currentWorkspaceId) {
      setCurrentWorkspaceId(currentWorkspace.id);
    }
  }, [currentWorkspace, currentWorkspaceId]);

  React.useEffect(() => {
    if (currentWorkspace) {
      // Reserved for future workspace-change side effects
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
