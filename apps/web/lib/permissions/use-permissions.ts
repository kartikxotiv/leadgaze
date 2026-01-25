/**
 * Custom Permission Hooks
 * Convenient hooks for checking permissions throughout the app
 */

'use client';

import { useMemo } from 'react';

import { usePermissions } from './permission-provider';
import type { PermissionCheckResult } from './types';

/**
 * Custom Permission Hooks
 * Convenient hooks for checking permissions throughout the app
 */

/**
 * Hook to check if user has permission to a feature
 * @example
 * const canCreateLead = useHasPermission('leads', 'create');
 * if (canCreateLead) {
 *   // show create button
 * }
 */
export function useHasPermission(moduleKey: string, featureKey: string) {
  const { hasPermission } = usePermissions();
  return useMemo(
    () => hasPermission(moduleKey, featureKey),
    [moduleKey, featureKey, hasPermission],
  );
}

/**
 * Hook to get detailed permission information
 * @example
 * const permission = usePermissionDetail('leads', 'view');
 * if (permission.canAccess && permission.accessLevel === 'all') {
 *   // show all leads
 * }
 */
export function usePermissionDetail(
  moduleKey: string,
  featureKey: string,
): PermissionCheckResult {
  const { checkPermissionByKey } = usePermissions();
  return useMemo(
    () => checkPermissionByKey(moduleKey, featureKey),
    [moduleKey, featureKey, checkPermissionByKey],
  );
}

/**
 * Hook to get all accessible modules for the user
 * @example
 * const modules = useAccessibleModules();
 * modules.forEach(module => {
 *   console.log(module.module_name, module.features);
 * });
 */
export function useAccessibleModules() {
  const { getAccessibleModules } = usePermissions();
  return useMemo(() => getAccessibleModules(), [getAccessibleModules]);
}

/**
 * Hook to get all accessible features in a module
 * @example
 * const features = useAccessibleFeatures('leads');
 */
export function useAccessibleFeatures(moduleKey: string) {
  const { getAccessibleFeaturesInModule } = usePermissions();
  return useMemo(
    () => getAccessibleFeaturesInModule(moduleKey),
    [moduleKey, getAccessibleFeaturesInModule],
  );
}

/**
 * Hook to check if user can perform data operation
 * @example
 * const canEditLead = useCanAccessData(
 *   permission,
 *   leadOwnerId,
 *   currentUserId
 * );
 */
export function useCanAccessData(
  result: PermissionCheckResult,
  dataOwnerId?: string,
  currentUserId?: string,
) {
  const { canAccess } = usePermissions();
  return useMemo(
    () => canAccess(result, dataOwnerId, currentUserId),
    [result, dataOwnerId, currentUserId, canAccess],
  );
}

/**
 * Hook to check if user is admin (highest hierarchy level)
 * @example
 * const isAdmin = useIsAdmin();
 */
export function useIsAdmin() {
  const { role } = usePermissions();
  return role?.role_key === 'admin' || role?.hierarchy_level === 100;
}

/**
 * Hook to check if user is manager or above
 * @example
 * const isManagerOrAbove = useIsManagerOrAbove();
 */
export function useIsManagerOrAbove() {
  const { role } = usePermissions();
  return (role?.hierarchy_level ?? 0) >= 50;
}

/**
 * Hook to get current user's role
 */
export function useUserRole() {
  const { role } = usePermissions();
  return role;
}

/**
 * Hook to check permission loading state
 */
export function usePermissionsLoading() {
  const { loading, error } = usePermissions();
  return { loading, error };
}
