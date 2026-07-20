'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useUser } from '@kit/supabase/hooks/use-user';

export const FUNDRAISING_MODULE_KEYS = {
  investors: 'fundraising_investors',
  rounds: 'fundraising_rounds',
  pipeline: 'fundraising_pipeline',
} as const;

export const FUNDRAISING_FEATURE_KEYS = {
  view: 'view',
  create: 'create',
  edit: 'edit',
  delete: 'delete',
  export: 'export',
  addContact: 'add_contact',
  addNote: 'add_note',
  scheduleMeeting: 'schedule_meeting',
  createDeal: 'create_deal',
  editDeal: 'edit_deal',
  deleteDeal: 'delete_deal',
  moveStage: 'move_stage',
  manageStages: 'manage_stages',
} as const;

export type FundraisingModuleKey =
  (typeof FUNDRAISING_MODULE_KEYS)[keyof typeof FUNDRAISING_MODULE_KEYS];

export type FundraisingFeatureKey =
  (typeof FUNDRAISING_FEATURE_KEYS)[keyof typeof FUNDRAISING_FEATURE_KEYS];

export type FundraisingCanAccess = (
  moduleKey: string,
  featureKey?: string,
) => boolean;

export type FundraisingPermissionContext = {
  canAccess?: FundraisingCanAccess;
};

type FundraisingPermission = {
  module: string;
  feature: string;
  can_access: boolean;
};

export function canAccessFundraisingFeature(
  permissions: FundraisingPermissionContext | FundraisingCanAccess | undefined,
  moduleKey: FundraisingModuleKey,
  featureKey: FundraisingFeatureKey = FUNDRAISING_FEATURE_KEYS.view,
) {
  if (!permissions) {
    return true;
  }

  const canAccess =
    typeof permissions === 'function' ? permissions : permissions.canAccess;

  if (!canAccess) {
    return true;
  }

  return Boolean(canAccess(moduleKey, featureKey));
}

export function createFundraisingPermissionChecker(
  permissions?: FundraisingPermissionContext | FundraisingCanAccess,
) {
  return (
    moduleKey: FundraisingModuleKey,
    featureKey: FundraisingFeatureKey = FUNDRAISING_FEATURE_KEYS.view,
  ) => canAccessFundraisingFeature(permissions, moduleKey, featureKey);
}

export function useFundraisingPermissions(workspaceId?: string) {
  const supabase = useSupabase();
  const { data: user, isLoading: isUserLoading } = useUser();

  const {
    data: permissions = [],
    isLoading: isPermissionsLoading,
    error,
  } = useQuery<FundraisingPermission[]>({
    queryKey: ['fundraising', 'permissions', workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user?.id) {
        return [];
      }

      const { data: members, error: memberError } = await supabase
        .from('workspace_members')
        .select('role_id, product_key')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (memberError) {
        throw memberError;
      }

      if (!members || members.length === 0) {
        return [];
      }

      const member = members.find((m: any) => m.product_key === 'funds')
        || members.find((m: any) => m.product_key === null)
        || members[0];

      const roleId =
        typeof member?.role_id === 'object'
          ? (member.role_id as { id?: string })?.id
          : member?.role_id;

      if (!roleId) {
        return [];
      }

      const { data: permissionsData, error: permissionsError } = await supabase
        .from('role_permissions')
        .select(
          `
          can_access,
          crm_module_features!module_feature_id (
            feature_key,
            crm_modules!module_id (
              module_key
            )
          )
        `,
        )
        .eq('role_id', roleId);

      if (permissionsError) {
        throw permissionsError;
      }

      return (permissionsData ?? []).map((permission: any) => ({
        module:
          permission.crm_module_features?.crm_modules?.module_key ?? '',
        feature: permission.crm_module_features?.feature_key ?? '',
        can_access: Boolean(permission.can_access),
      }));
    },
    enabled: Boolean(workspaceId && user?.id),
    staleTime: 30_000,
  });

  const canAccess = useMemo<FundraisingCanAccess>(
    () => (moduleKey: string, featureKey = FUNDRAISING_FEATURE_KEYS.view) => {
      return permissions.some(
        (permission) =>
          permission.module === moduleKey &&
          permission.feature === featureKey &&
          permission.can_access,
      );
    },
    [permissions],
  );

  return {
    permissions,
    canAccess,
    isLoading: isUserLoading || isPermissionsLoading,
    error: error as Error | null,
  };
}
