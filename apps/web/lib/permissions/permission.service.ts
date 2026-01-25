/**
 * Permission Service
 * Handles permission checking and access control logic
 */
import type {
  AccessibleModule,
  Module,
  ModuleFeature,
  PermissionAccessLevel,
  PermissionCheckResult,
  RolePermission,
} from './types';

/**
 * Checks if a user has access to a specific module feature
 */
export function checkPermission(
  permissions: RolePermission[],
  moduleFeatureId: string,
  features: ModuleFeature[] = [],
  modules: Module[] = [],
): PermissionCheckResult {
  const permission = permissions.find(
    (p) => p.module_feature_id === moduleFeatureId,
  );

  if (!permission) {
    return {
      canAccess: false,
      accessLevel: 'none',
      canViewSensitiveData: false,
      canOverrideOwner: false,
    };
  }

  const feature = features.find((f) => f.id === moduleFeatureId);
  const module = feature
    ? modules.find((m) => m.id === feature.module_id)
    : undefined;

  return {
    canAccess: permission.can_access,
    accessLevel: permission.access_level,
    canViewSensitiveData: permission.can_view_sensitive_data,
    canOverrideOwner: permission.can_override_owner,
    feature,
    module,
  };
}

/**
 * Checks if a user has access to a feature by module key and feature key
 */
export function checkPermissionByKey(
  permissions: RolePermission[],
  moduleKey: string,
  featureKey: string,
  features: ModuleFeature[] = [],
  modules: Module[] = [],
): PermissionCheckResult {
  const module = modules.find((m) => m.module_key === moduleKey);
  if (!module) {
    return {
      canAccess: false,
      accessLevel: 'none',
      canViewSensitiveData: false,
      canOverrideOwner: false,
    };
  }

  const feature = features.find(
    (f) => f.module_id === module.id && f.feature_key === featureKey,
  );

  if (!feature) {
    return {
      canAccess: false,
      accessLevel: 'none',
      canViewSensitiveData: false,
      canOverrideOwner: false,
    };
  }

  return checkPermission(permissions, feature.id, features, modules);
}

/**
 * Get all accessible modules for a user
 */
export function getAccessibleModules(
  permissions: RolePermission[],
  modules: Module[],
  features: ModuleFeature[],
): AccessibleModule[] {
  return modules
    .filter((module) => module.is_active)
    .map((module) => {
      const moduleFeatures = features
        .filter((f) => f.module_id === module.id && f.is_active)
        .map((feature) => {
          const permission = permissions.find(
            (p) => p.module_feature_id === feature.id,
          );

          return {
            ...feature,
            permission: permission,
            canAccess: permission?.can_access ?? false,
            accessLevel: (permission?.access_level ??
              'none') as PermissionAccessLevel,
          };
        });

      return {
        ...module,
        features: moduleFeatures,
      };
    })
    .filter((module) => module.features.some((f) => f.canAccess));
}

/**
 * Get all accessible features in a module for a user
 */
export function getAccessibleFeaturesInModule(
  permissions: RolePermission[],
  moduleKey: string,
  modules: Module[],
  features: ModuleFeature[],
) {
  const module = modules.find((m) => m.module_key === moduleKey);
  if (!module) return [];

  return features
    .filter((f) => f.module_id === module.id && f.is_active)
    .map((feature) => {
      const permission = permissions.find(
        (p) => p.module_feature_id === feature.id,
      );

      return {
        ...feature,
        permission: permission,
        canAccess: permission?.can_access ?? false,
        accessLevel: (permission?.access_level ??
          'none') as PermissionAccessLevel,
      };
    })
    .filter((f) => f.canAccess);
}

/**
 * Check if user can perform an action on a resource
 * Considers both feature access and data access level
 */
export function canAccessData(
  permission: PermissionCheckResult,
  dataOwnerId?: string,
  currentUserId?: string,
): boolean {
  if (!permission.canAccess) return false;

  // If access level is 'all', user can access any data
  if (permission.accessLevel === 'all') return true;

  // If access level is 'none', user cannot access any data
  if (permission.accessLevel === 'none') return false;

  // For 'own' access level, check if user owns the data
  if (permission.accessLevel === 'own') {
    return dataOwnerId === currentUserId;
  }

  // For 'team' access level, would need team membership data
  // This is a simplified check - in practice you'd check if users share a team
  return true;
}

/**
 * Check if user can perform a sensitive operation
 */
export function canViewSensitiveData(
  permission: PermissionCheckResult,
): boolean {
  return permission.canViewSensitiveData;
}

/**
 * Check if user can override owner restrictions
 */
export function canOverrideOwner(permission: PermissionCheckResult): boolean {
  return permission.canOverrideOwner;
}

/**
 * Get access level display name
 */
export function getAccessLevelDisplayName(
  level: PermissionAccessLevel,
): string {
  const names: Record<PermissionAccessLevel, string> = {
    none: 'No Access',
    own: 'Own Records Only',
    team: 'Team Records',
    all: 'All Records',
  };
  return names[level];
}

/**
 * Check if a feature type requires write access
 */
export function isWriteOperation(featureType: string): boolean {
  const writeOperations = ['crud', 'action', 'import', 'bulk'];
  return writeOperations.includes(featureType);
}
