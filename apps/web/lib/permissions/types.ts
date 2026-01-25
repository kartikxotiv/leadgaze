/**
 * Permission System Types
 * Defines all types used in the permission and access control system
 */

export type PermissionAccessLevel = 'none' | 'own' | 'team' | 'all';
export type FeatureType =
  | 'crud'
  | 'action'
  | 'view'
  | 'export'
  | 'import'
  | 'bulk';

/**
 * Represents a module (e.g., Leads, Contacts, Accounts)
 */
export interface Module {
  id: string;
  module_key: string;
  module_name: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  is_system: boolean;
  is_active: boolean;
  parent_module_id: string | null;
}

/**
 * Represents a feature within a module (e.g., Create, Read, Edit, Delete)
 */
export interface ModuleFeature {
  id: string;
  module_id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  feature_type: FeatureType;
  display_order: number;
  is_system: boolean;
  is_active: boolean;
}

/**
 * Represents a permission assigned to a role for a feature
 */
export interface RolePermission {
  id: string;
  role_id: string;
  module_feature_id: string;
  workspace_id: string;
  can_access: boolean;
  access_level: PermissionAccessLevel;
  can_view_sensitive_data: boolean;
  can_override_owner: boolean;
  conditions: Record<string, unknown> | null;
}

/**
 * Represents a workspace role
 */
export interface WorkspaceRole {
  id: string;
  workspace_id: string;
  role_key: string;
  role_name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  hierarchy_level: number;
  color: string | null;
}

/**
 * Permission context data loaded once per session
 */
export interface PermissionContextData {
  userId: string;
  workspaceId: string;
  roleId: string;
  role: WorkspaceRole;
  permissions: RolePermission[];
  modules: Module[];
  features: ModuleFeature[];
  loading: boolean;
  error: Error | null;
}

/**
 * Result of checking a permission
 */
export interface PermissionCheckResult {
  canAccess: boolean;
  accessLevel: PermissionAccessLevel;
  canViewSensitiveData: boolean;
  canOverrideOwner: boolean;
  feature?: ModuleFeature;
  module?: Module;
}

/**
 * Accessible module with features the user can access
 */
export interface AccessibleModule extends Module {
  features: AccessibleFeature[];
}

/**
 * Accessible feature with permission details
 */
export interface AccessibleFeature extends ModuleFeature {
  permission?: RolePermission;
  canAccess: boolean;
  accessLevel: PermissionAccessLevel;
}
