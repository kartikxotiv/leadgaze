'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useUser } from '@kit/supabase/hooks/use-user';

export const SERVICE_CLOUD_MODULE_KEYS = {
  dashboard: 'service_cloud',
  customers: 'service_cloud_customers',
  tickets: 'service_cloud_tickets',
  inboxes: 'service_cloud_inboxes',
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
  reply: 'reply',
  log: 'log',
  export: 'export',
  manageStatuses: 'manage_statuses',
  managePriorities: 'manage_priorities',
  manageCategories: 'manage_categories',
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

export function useServiceCloudPermissions(workspaceId?: string) {
  const supabase = useSupabase();
  const { data: user } = useUser();

  const { data: permissions = [], isLoading } = useQuery<
    ServiceCloudPermission[]
  >({
    queryKey: ['service-cloud', 'permissions', workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user?.id) return [];

      // Single combined join query
      const { data: member, error } = await supabase
        .from('workspace_members')
        .select(
          `
          role_id(
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
        .eq('status', 'accepted')
        .maybeSingle();

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const role = member?.role_id as any;
      const permissionsData = role?.role_permissions || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return permissionsData.map((permission: any) => ({
        module: permission.crm_module_features?.crm_modules?.module_key ?? '',
        feature: permission.crm_module_features?.feature_key ?? '',
        can_access: Boolean(permission.can_access),
      }));
    },
    enabled: Boolean(workspaceId && user?.id),
    staleTime: 30_000,
  });

  const canAccess = useMemo<ServiceCloudCanAccess>(
    () =>
      (moduleKey: string, featureKey = SERVICE_CLOUD_FEATURE_KEYS.view) =>
        permissions.some(
          (permission) =>
            permission.module === moduleKey &&
            permission.feature === featureKey &&
            permission.can_access,
        ),
    [permissions],
  );

  return { permissions, canAccess, isLoading };
}
