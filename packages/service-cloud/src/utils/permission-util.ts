'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useUser } from '@kit/supabase/hooks/use-user';

export const SERVICE_CLOUD_MODULE_KEYS = {
  dashboard: 'service_cloud',
  customers: 'service_cloud_customers',
  tickets: 'service_cloud_tickets',
  inboxes: 'emails',
  timeTracking: 'service_cloud_time_tracking',
  reports: 'service_cloud_reports',
  settings: 'service_cloud_settings',
} as const;

export const SERVICE_CLOUD_FEATURE_KEYS = {
  view: 'view',
  create: 'create',
  edit: 'edit',
  delete: 'delete',
  manage: 'manage',
  assign: 'assign',
  changeStatus: 'change_status',
  log: 'log',
  export: 'export',
  manageInbox: 'manage_inbox',
  manageStatuses: 'manage_statuses',
  managePriorities: 'manage_priorities',
  manageCategories: 'manage_categories',
  manageNotifications: 'manage_notifications',
} as const;

export type ServiceCloudModuleKey =
  (typeof SERVICE_CLOUD_MODULE_KEYS)[keyof typeof SERVICE_CLOUD_MODULE_KEYS];

export type ServiceCloudFeatureKey =
  (typeof SERVICE_CLOUD_FEATURE_KEYS)[keyof typeof SERVICE_CLOUD_FEATURE_KEYS];

export type ServiceCloudCanAccess = (
  moduleKey: string,
  featureKey?: string,
) => boolean;

type ServiceCloudPermission = {
  module: string;
  feature: string;
  can_access: boolean;
};

export function canAccessServiceCloudFeature(
  canAccess: ServiceCloudCanAccess | undefined,
  moduleKey: ServiceCloudModuleKey,
  featureKey: ServiceCloudFeatureKey = SERVICE_CLOUD_FEATURE_KEYS.view,
) {
  if (!canAccess) return true;
  return Boolean(canAccess(moduleKey, featureKey));
}

const SERVICE_CLOUD_SETTINGS_FEATURES = [
  SERVICE_CLOUD_FEATURE_KEYS.manageStatuses,
  SERVICE_CLOUD_FEATURE_KEYS.managePriorities,
  SERVICE_CLOUD_FEATURE_KEYS.manageCategories,
  SERVICE_CLOUD_FEATURE_KEYS.manageNotifications,
] as const;

export function canAccessServiceCloudSettings(
  canAccess: ServiceCloudCanAccess | undefined,
) {
  return SERVICE_CLOUD_SETTINGS_FEATURES.some((featureKey) =>
    canAccessServiceCloudFeature(
      canAccess,
      SERVICE_CLOUD_MODULE_KEYS.settings,
      featureKey,
    ),
  );
}

export function useServiceCloudPermissions(workspaceId?: string) {
  const supabase = useSupabase();
  const { data: user } = useUser();

  const { data: permissionsResponse, isLoading } = useQuery<{
    roleKey: string;
    permissions: ServiceCloudPermission[];
  }>({
    queryKey: ['service-cloud', 'permissions', workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return { roleKey: '', permissions: [] };

      // Single combined join query
      const { data: members, error } = await supabase
        .from('workspace_members')
        .select(
          `
          product_key,
          role_id(
            role_key,
            role_permissions(
              can_access,
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
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) throw error;
      if (!members || members.length === 0) return { roleKey: '', permissions: [] };

      const member = members.find((m: any) => m.product_key === 'service_cloud')
        || members.find((m: any) => m.product_key === null)
        || members[0];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const role = member?.role_id as any;
      const permissionsData = role?.role_permissions || [];
      const roleKey = role?.role_key || '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const permissions = permissionsData.map((permission: any) => ({
        module: permission.crm_module_features?.crm_modules?.module_key ?? '',
        feature: permission.crm_module_features?.feature_key ?? '',
        can_access: Boolean(permission.can_access),
      }));

      return { roleKey, permissions };
    },
    enabled: Boolean(workspaceId && user?.id),
    staleTime: 30_000,
  });

  const permissions = permissionsResponse?.permissions || [];
  const roleKey = permissionsResponse?.roleKey || '';

  const canAccess = useMemo<ServiceCloudCanAccess>(
    () =>
      (moduleKey: string, featureKey = SERVICE_CLOUD_FEATURE_KEYS.view) => {
        if (roleKey === 'admin') return true;
        return permissions.some(
          (p) =>
            p.module === moduleKey &&
            p.feature === featureKey &&
            p.can_access,
        );
      },
    [permissions, roleKey],
  );

  return { permissions, canAccess, isLoading };
}
