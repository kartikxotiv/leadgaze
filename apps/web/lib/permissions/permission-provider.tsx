/**
 * Permission Provider Context
 * Provides permission data to the entire application
 * Caches permission data to avoid repeated API calls
 */

'use client';

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';

import { usePermissionData } from './permission.api';
import {
  canAccessData,
  canOverrideOwner,
  canViewSensitiveData,
  checkPermission,
  checkPermissionByKey,
  getAccessibleFeaturesInModule,
  getAccessibleModules,
} from './permission.service';
import type {
  AccessibleModule,
  Module,
  ModuleFeature,
  PermissionAccessLevel,
  PermissionCheckResult,
  RolePermission,
  WorkspaceRole,
} from './types';

/**
 * Permission Provider Context
 * Provides permission data to the entire application
 * Caches permission data to avoid repeated API calls
 */

/**
 * Permission Provider Context
 * Provides permission data to the entire application
 * Caches permission data to avoid repeated API calls
 */

/**
 * Permission Provider Context
 * Provides permission data to the entire application
 * Caches permission data to avoid repeated API calls
 */

/**
 * Permission Provider Context
 * Provides permission data to the entire application
 * Caches permission data to avoid repeated API calls
 */

/**
 * Permission Provider Context
 * Provides permission data to the entire application
 * Caches permission data to avoid repeated API calls
 */

/**
 * Permission Provider Context
 * Provides permission data to the entire application
 * Caches permission data to avoid repeated API calls
 */

/**
 * Permission Provider Context
 * Provides permission data to the entire application
 * Caches permission data to avoid repeated API calls
 */

/**
 * Permission Provider Context
 * Provides permission data to the entire application
 * Caches permission data to avoid repeated API calls
 */

export interface PermissionContextValue {
  // Data
  role: WorkspaceRole | null;
  permissions: RolePermission[];
  modules: Module[];
  features: ModuleFeature[];
  loading: boolean;
  error: Error | null;

  // Permission checking methods
  checkPermission: (featureId: string) => PermissionCheckResult;
  checkPermissionByKey: (
    moduleKey: string,
    featureKey: string,
  ) => PermissionCheckResult;
  hasPermission: (moduleKey: string, featureKey: string) => boolean;
  canAccess: (
    result: PermissionCheckResult,
    dataOwnerId?: string,
    currentUserId?: string,
  ) => boolean;
  canViewSensitiveData: (result: PermissionCheckResult) => boolean;
  canOverrideOwner: (result: PermissionCheckResult) => boolean;

  // Data retrieval methods
  getAccessibleModules: () => AccessibleModule[];
  getAccessibleFeaturesInModule: (
    moduleKey: string,
  ) => ReturnType<typeof getAccessibleFeaturesInModule>;
}

const PermissionContext = createContext<PermissionContextValue | undefined>(
  undefined,
);

export function PermissionProvider({
  workspaceId,
  children,
}: {
  workspaceId: string;
  children: ReactNode;
}) {
  const { data, isLoading, error }: any = usePermissionData(workspaceId);

  // Memoize permission checking to avoid re-renders
  const permissionCheckFunctions = useMemo(() => {
    const permissions = data?.data?.permissions ?? [];
    const modules = data?.data?.modules ?? [];
    const features = data?.data?.features ?? [];

    return {
      checkPermission: (featureId: string) =>
        checkPermission(permissions, featureId, features, modules),

      checkPermissionByKey: (moduleKey: string, featureKey: string) =>
        checkPermissionByKey(
          permissions,
          moduleKey,
          featureKey,
          features,
          modules,
        ),

      hasPermission: (moduleKey: string, featureKey: string) => {
        const result = checkPermissionByKey(
          permissions,
          moduleKey,
          featureKey,
          features,
          modules,
        );
        return result.canAccess;
      },

      canAccess: (
        result: PermissionCheckResult,
        dataOwnerId?: string,
        currentUserId?: string,
      ) => canAccessData(result, dataOwnerId, currentUserId),

      canViewSensitiveData: (result: PermissionCheckResult) =>
        canViewSensitiveData(result),

      canOverrideOwner: (result: PermissionCheckResult) =>
        canOverrideOwner(result),

      getAccessibleModules: () =>
        getAccessibleModules(permissions, modules, features),

      getAccessibleFeaturesInModule: (moduleKey: string) =>
        getAccessibleFeaturesInModule(
          permissions,
          moduleKey,
          modules,
          features,
        ),
    };
  }, [data?.data?.permissions, data?.data?.modules, data?.data?.features]);

  const value: PermissionContextValue = {
    role: data?.role ?? null,
    permissions: data?.permissions ?? [],
    modules: data?.modules ?? [],
    features: data?.features ?? [],
    loading: isLoading,
    error: error ?? null,
    ...permissionCheckFunctions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

/**
 * Hook to use permission context
 * Must be used within PermissionProvider
 */
export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
}
