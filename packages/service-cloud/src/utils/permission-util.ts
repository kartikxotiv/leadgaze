'use client';

import { useMemo, useState, useEffect } from 'react';

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
  const { data: user } = useUser();
  const [permissionsResponse, setPermissionsResponse] = useState<{ roleKey: string; permissions: ServiceCloudPermission[] }>({ roleKey: '', permissions: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId || !user?.id) {
      setPermissionsResponse({ roleKey: '', permissions: [] });
      setIsLoading(false);
      return;
    }

    try {
      const cachedData = typeof window !== 'undefined' 
        ? JSON.parse(sessionStorage.getItem(`workspace-${workspaceId}-init`) || '{}') 
        : null;

      if (cachedData?.current_workspace?.roles) {
        const roles = cachedData.current_workspace.roles;
        const role = roles['service_cloud'] || roles['sales'] || Object.values(roles)[0] as any;
        
        if (role) {
          const permissions = (role.permissions || []).map((p: any) => ({
            module: p.module,
            feature: p.feature,
            can_access: p.can_access,
          }));
          
          setPermissionsResponse({ roleKey: role.role_key, permissions });
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error("Failed to read permissions from sessionStorage", e);
    }
    
    setIsLoading(false);
  }, [workspaceId, user?.id]);

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
