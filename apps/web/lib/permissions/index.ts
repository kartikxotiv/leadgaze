/**
 * Index file for permissions module
 * Exports all permission-related utilities and components
 */

// Types
export * from './types';

// Services
export * from './permission.service';
export * from './permission.api';

// Provider and hooks
export { PermissionProvider, usePermissions } from './permission-provider';
export type { PermissionContextValue } from './permission-provider';
export {
  useHasPermission,
  usePermissionDetail,
  useAccessibleModules,
  useAccessibleFeatures,
  useCanAccessData,
  useIsAdmin,
  useIsManagerOrAbove,
  useUserRole,
  usePermissionsLoading,
} from './use-permissions';

// Navigation permissions
export {
  usePermissionBasedNavigation,
  usePermissionBasedNavigationConfig,
} from './use-navigation-permissions';

// UI Components
export {
  IfHasPermission,
  WithPermission,
  PermissionGate,
  PermissionDenied,
} from './permission-ui';
