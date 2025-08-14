// Permission system for role-based access control
export interface RolePermissions {
  // Organization Management
  can_manage_organization?: boolean;
  can_delete_organization?: boolean;
  can_manage_subscription?: boolean;

  // User Management
  can_invite_users?: boolean;
  can_remove_users?: boolean;
  can_change_user_roles?: boolean;

  // Workspace Management
  can_create_workspaces?: boolean;
  can_delete_workspaces?: boolean;
  can_manage_workspaces?: boolean;

  // Data Access
  can_view_all_data?: boolean;
  can_edit_all_data?: boolean;
  can_delete_all_data?: boolean;

  // Reports
  can_view_reports?: boolean;
  can_export_data?: boolean;
}

export interface UserRole {
  id: string;
  role: string;
  displayName: string;
  permissions: RolePermissions;
  hierarchyLevel: number;
}

export interface UserOrganization {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  role: string;
  roleDisplayName: string;
  permissions: RolePermissions;
  subscription_status: string;
  plan_type?: string;
}

export class PermissionManager {
  /**
   * Check if user has a specific permission
   */
  static hasPermission(
    userOrganization: UserOrganization | null,
    permission: keyof RolePermissions
  ): boolean {
    if (!userOrganization || !userOrganization.permissions) {
      return false;
    }

    return userOrganization.permissions[permission] === true;
  }

  /**
   * Check if user has any of the specified permissions
   */
  static hasAnyPermission(
    userOrganization: UserOrganization | null,
    permissions: (keyof RolePermissions)[]
  ): boolean {
    return permissions.some((permission) =>
      this.hasPermission(userOrganization, permission)
    );
  }

  /**
   * Check if user has all of the specified permissions
   */
  static hasAllPermissions(
    userOrganization: UserOrganization | null,
    permissions: (keyof RolePermissions)[]
  ): boolean {
    return permissions.every((permission) =>
      this.hasPermission(userOrganization, permission)
    );
  }

  /**
   * Role hierarchy checks
   */
  static isOwner(userOrganization: UserOrganization | null): boolean {
    return userOrganization?.role === "owner";
  }

  static isAdmin(userOrganization: UserOrganization | null): boolean {
    return userOrganization?.role === "admin" || this.isOwner(userOrganization);
  }

  static isManager(userOrganization: UserOrganization | null): boolean {
    return (
      userOrganization?.role === "manager" || this.isAdmin(userOrganization)
    );
  }

  static isViewer(userOrganization: UserOrganization | null): boolean {
    return userOrganization?.role === "viewer";
  }

  /**
   * Feature-specific permission checks
   */
  static canInviteUsers(userOrganization: UserOrganization | null): boolean {
    return this.hasPermission(userOrganization, "can_invite_users");
  }

  static canManageWorkspaces(
    userOrganization: UserOrganization | null
  ): boolean {
    return this.hasPermission(userOrganization, "can_manage_workspaces");
  }

  static canViewReports(userOrganization: UserOrganization | null): boolean {
    return this.hasPermission(userOrganization, "can_view_reports");
  }

  static canManageOrganization(
    userOrganization: UserOrganization | null
  ): boolean {
    return this.hasPermission(userOrganization, "can_manage_organization");
  }

  static canManageSubscription(
    userOrganization: UserOrganization | null
  ): boolean {
    return this.hasPermission(userOrganization, "can_manage_subscription");
  }

  static canRemoveUsers(userOrganization: UserOrganization | null): boolean {
    return this.hasPermission(userOrganization, "can_remove_users");
  }

  static canChangeUserRoles(
    userOrganization: UserOrganization | null
  ): boolean {
    return this.hasPermission(userOrganization, "can_change_user_roles");
  }

  static canDeleteOrganization(
    userOrganization: UserOrganization | null
  ): boolean {
    return this.hasPermission(userOrganization, "can_delete_organization");
  }

  static canExportData(userOrganization: UserOrganization | null): boolean {
    return this.hasPermission(userOrganization, "can_export_data");
  }

  /**
   * Get user's effective permissions as an array
   */
  static getEffectivePermissions(
    userOrganization: UserOrganization | null
  ): string[] {
    if (!userOrganization || !userOrganization.permissions) {
      return [];
    }

    return Object.entries(userOrganization.permissions)
      .filter(([_, value]) => value === true)
      .map(([permission, _]) => permission);
  }

  /**
   * Check if user can perform action on target user role
   */
  static canManageRole(
    currentUserOrg: UserOrganization | null,
    targetRole: string
  ): boolean {
    if (!currentUserOrg) return false;

    // Define role hierarchy levels
    const roleLevels: Record<string, number> = {
      viewer: 20,
      manager: 60,
      admin: 80,
      owner: 100,
    };

    const currentLevel = roleLevels[currentUserOrg.role] || 0;
    const targetLevel = roleLevels[targetRole] || 0;

    // Can only manage roles below your level
    return currentLevel > targetLevel;
  }

  /**
   * Get available roles that user can assign
   */
  static getAssignableRoles(currentUserOrg: UserOrganization | null): string[] {
    if (!currentUserOrg) return [];

    const allRoles = ["viewer", "manager", "admin", "owner"];

    return allRoles.filter((role) => this.canManageRole(currentUserOrg, role));
  }

  /**
   * Check subscription-based limits
   */
  static checkSubscriptionLimit(
    userOrganization: UserOrganization | null,
    feature: string
  ): boolean {
    if (!userOrganization) return false;

    // Implementation depends on your subscription logic
    // This is a placeholder for subscription-based feature access
    const planLimits: Record<string, string[]> = {
      trial: ["basic_features"],
      basic: ["basic_features", "advanced_reports"],
      pro: ["basic_features", "advanced_reports", "integrations"],
      enterprise: [
        "basic_features",
        "advanced_reports",
        "integrations",
        "white_label",
      ],
    };

    const userPlan = userOrganization.plan_type || "trial";
    const allowedFeatures = planLimits[userPlan] || [];

    return allowedFeatures.includes(feature);
  }

  /**
   * Role display utilities
   */
  static getRoleDisplayName(role: string): string {
    const roleNames: Record<string, string> = {
      owner: "Owner",
      admin: "Administrator",
      manager: "Manager",
      viewer: "Viewer",
    };

    return roleNames[role] || role;
  }

  static getRoleDescription(role: string): string {
    const descriptions: Record<string, string> = {
      owner: "Full access to organization settings, billing, and all data",
      admin:
        "Manage users, workspaces, and organization settings (except billing)",
      manager: "Manage workspaces and team data, invite users",
      viewer: "View-only access to data",
    };

    return descriptions[role] || "";
  }

  static getRoleBadgeColor(role: string): string {
    const colors: Record<string, string> = {
      owner: "bg-purple-100 text-purple-800",
      admin: "bg-blue-100 text-blue-800",
      manager: "bg-green-100 text-green-800",
      viewer: "bg-gray-100 text-gray-800",
    };

    return colors[role] || "bg-gray-100 text-gray-800";
  }
}
