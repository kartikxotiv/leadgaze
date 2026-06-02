'use client';

import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useUser } from '@kit/supabase/hooks/use-user';

export const INVENTORY_MODULE_KEYS = {
  inventory: 'inventory',
  products: 'inventory_products',
  warehouses: 'inventory_warehouses',
  stock: 'inventory_stock',
  purchases: 'inventory_purchases',
  customers: 'inventory_customers',
  sales: 'inventory_sales',
  audits: 'inventory_audits',
  reports: 'inventory_reports',
} as const;

export const INVENTORY_FEATURE_KEYS = {
  view: 'view',
  create: 'create',
  edit: 'edit',
  delete: 'delete',
  export: 'export',
  manage: 'manage',
  clone: 'clone',
  archive: 'archive',
  import: 'import',
  manageCategories: 'manage_categories',
  manageBrands: 'manage_brands',
  manageUnits: 'manage_units',
  manageMedia: 'manage_media',
  receive: 'receive',
  issue: 'issue',
  adjust: 'adjust',
  transfer: 'transfer',
  reserve: 'reserve',
  release: 'release',
  approve: 'approve',
  receiveGoods: 'receive_goods',
  manageVendors: 'manage_vendors',
  manageContacts: 'manage_contacts',
  reserveStock: 'reserve_stock',
  fulfill: 'fulfill',
  dispatch: 'dispatch',
  reconcile: 'reconcile',
} as const;

export type InventoryModuleKey =
  (typeof INVENTORY_MODULE_KEYS)[keyof typeof INVENTORY_MODULE_KEYS];

export type InventoryFeatureKey =
  (typeof INVENTORY_FEATURE_KEYS)[keyof typeof INVENTORY_FEATURE_KEYS];

export type InventoryCanAccess = (
  moduleKey: string,
  featureKey?: string,
) => boolean;

export type InventoryPermissionContext = {
  canAccess?: InventoryCanAccess;
};

type InventoryPermission = {
  module: string;
  feature: string;
  can_access: boolean;
};

type PermissionJoinRow = {
  can_access: boolean | null;
  crm_module_features: {
    feature_key: string | null;
    crm_modules: {
      module_key: string | null;
    } | null;
  } | null;
};

export function canAccessInventoryFeature(
  permissions: InventoryPermissionContext | InventoryCanAccess | undefined,
  moduleKey: InventoryModuleKey,
  featureKey: InventoryFeatureKey = INVENTORY_FEATURE_KEYS.view,
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

export function createInventoryPermissionChecker(
  permissions?: InventoryPermissionContext | InventoryCanAccess,
) {
  return (
    moduleKey: InventoryModuleKey,
    featureKey: InventoryFeatureKey = INVENTORY_FEATURE_KEYS.view,
  ) => canAccessInventoryFeature(permissions, moduleKey, featureKey);
}

export function useInventoryPermissions(workspaceId?: string) {
  const supabase = useSupabase();
  const { data: user, isLoading: isUserLoading } = useUser();

  const {
    data: permissions = [],
    isLoading: isPermissionsLoading,
    error,
  } = useQuery<InventoryPermission[]>({
    queryKey: ['inventory', 'permissions', workspaceId, user?.id],
    queryFn: async () => {
      if (!workspaceId || !user?.id) {
        return [];
      }

      const { data: member, error: memberError } = await supabase
        .from('workspace_members')
        .select('role_id')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();

      if (memberError) {
        throw memberError;
      }

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

      return ((permissionsData ?? []) as PermissionJoinRow[]).map((permission) => ({
        module: permission.crm_module_features?.crm_modules?.module_key ?? '',
        feature: permission.crm_module_features?.feature_key ?? '',
        can_access: Boolean(permission.can_access),
      }));
    },
    enabled: Boolean(workspaceId && user?.id),
    staleTime: 30_000,
  });

  const canAccess = useMemo<InventoryCanAccess>(
    () => (moduleKey: string, featureKey = INVENTORY_FEATURE_KEYS.view) => {
      const hasInventoryPermissionsSeeded = permissions.some(
        (p) => p.module && p.module.startsWith('inventory'),
      );

      if (!hasInventoryPermissionsSeeded) {
        return true;
      }

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
