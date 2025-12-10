import { supabase } from "../supabase-client";
import { AuthService } from "../auth-service";

export interface PermissionContext {
  userId: string;
  organizationId: string;
  workspaceId?: string;
}

export interface WorkspacePermission {
  // Workspace management
  can_view_workspace: boolean;
  can_edit_workspace: boolean;
  can_delete_workspace: boolean;
  can_manage_workspace_settings: boolean;

  // Member management
  can_invite_members: boolean;
  can_remove_members: boolean;
  can_change_member_roles: boolean;
  can_view_members: boolean;

  // Workspace roles
  can_create_roles: boolean;
  can_edit_roles: boolean;
  can_delete_roles: boolean;
  can_view_roles: boolean;

  // Data access
  can_view_all_data: boolean;
  can_edit_all_data: boolean;
  can_delete_all_data: boolean;
  can_export_data: boolean;
}

export interface OrganizationPermission {
  // Organization management
  can_manage_organization: boolean;
  can_delete_organization: boolean;
  can_manage_subscription: boolean;
  can_view_organization_settings: boolean;

  // User management
  can_invite_users: boolean;
  can_remove_users: boolean;
  can_change_user_roles: boolean;
  can_view_users: boolean;

  // Workspace management
  can_create_workspaces: boolean;
  can_delete_workspaces: boolean;
  can_manage_all_workspaces: boolean;
  can_view_all_workspaces: boolean;

  // Data access
  can_view_all_organization_data: boolean;
  can_edit_all_organization_data: boolean;
  can_export_organization_data: boolean;
}

export class RBACService {
  /**
   * Get user's organization role
   */
  static async getOrganizationRole(
    userId: string,
    organizationId: string
  ): Promise<{
    roleId: string;
    role: string;
    displayName: string;
    hierarchyLevel: number;
    permissions: any;
  } | null> {
    try {
      const { data, error } = await supabase
        .from("user_organizations")
        .select(
          `
          role_id,
          organization_role:organization_roles!user_organizations_role_id_fkey(
            id,
            role,
            display_name,
            hierarchy_level,
            permissions
          )
        `
        )
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .single();

      if (error || !data || !data.organization_role) {
        return null;
      }

      const orgRole = data.organization_role as any;
      return {
        roleId: orgRole.id,
        role: orgRole.role,
        displayName: orgRole.display_name,
        hierarchyLevel: orgRole.hierarchy_level || 0,
        permissions: orgRole.permissions || {},
      };
    } catch (error) {
      console.error("Error getting organization role:", error);
      return null;
    }
  }

  /**
   * Get user's workspace role
   */
  static async getWorkspaceRole(
    userId: string,
    workspaceId: string
  ): Promise<{
    roleId: string;
    name: string;
    hierarchyLevel: number;
    permissions: any;
  } | null> {
    try {
      console.log("[RBACService.getWorkspaceRole] Fetching role:", {
        userId,
        workspaceId,
      });

      const { data, error } = await supabase
        .from("workspace_members")
        .select(
          `
          role_id,
          workspace_role:workspace_roles!workspace_members_role_id_fkey(
            id,
            name,
            hierarchy_level,
            permissions
          )
        `
        )
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
        .eq("is_deleted", false)
        .eq("status", "accepted")
        .single();

      if (error) {
        console.error("[RBACService.getWorkspaceRole] Error:", error);
        return null;
      }

      if (!data) {
        console.log("[RBACService.getWorkspaceRole] No workspace member found");
        return null;
      }

      if (!data.workspace_role) {
        console.log(
          "[RBACService.getWorkspaceRole] No workspace role found in member data:",
          {
            roleId: data.role_id,
            hasWorkspaceRole: !!data.workspace_role,
          }
        );
        return null;
      }

      const wsRole = data.workspace_role as any;
      console.log("[RBACService.getWorkspaceRole] Found role:", {
        roleId: wsRole.id,
        name: wsRole.name,
        hierarchyLevel: wsRole.hierarchy_level,
        hasPermissions: !!wsRole.permissions,
        permissionsType: typeof wsRole.permissions,
        permissionsKeys: wsRole.permissions
          ? Object.keys(wsRole.permissions)
          : [],
        permissionsValue: JSON.stringify(wsRole.permissions, null, 2),
      });

      return {
        roleId: wsRole.id,
        name: wsRole.name,
        hierarchyLevel: wsRole.hierarchy_level || 0,
        permissions: wsRole.permissions || {},
      };
    } catch (error) {
      console.error("[RBACService.getWorkspaceRole] Exception:", error);
      return null;
    }
  }

  /**
   * Check if user has access to organization
   */
  static async hasOrganizationAccess(
    userId: string,
    organizationId: string
  ): Promise<boolean> {
    const role = await this.getOrganizationRole(userId, organizationId);
    return role !== null;
  }

  /**
   * Check if user has access to workspace
   */
  static async hasWorkspaceAccess(
    userId: string,
    workspaceId: string
  ): Promise<boolean> {
    // First check if user is a workspace member
    const workspaceRole = await this.getWorkspaceRole(userId, workspaceId);
    if (workspaceRole) {
      return true;
    }

    // If not a workspace member, check if user has organization-level access
    // Get workspace to find organization
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("organization_id")
      .eq("id", workspaceId)
      .single();

    if (!workspace) {
      return false;
    }

    // Check organization access
    return this.hasOrganizationAccess(userId, workspace.organization_id);
  }

  /**
   * Get effective workspace permissions
   * Combines organization-level and workspace-level permissions
   */
  static async getWorkspacePermissions(
    userId: string,
    workspaceId: string
  ): Promise<WorkspacePermission> {
    // Get workspace to find organization
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("organization_id")
      .eq("id", workspaceId)
      .single();

    if (!workspace) {
      return this.getDefaultWorkspacePermissions(false);
    }

    // Get organization role
    const orgRole = await this.getOrganizationRole(
      userId,
      workspace.organization_id
    );

    // Get workspace role
    const wsRole = await this.getWorkspaceRole(userId, workspaceId);

    // Default permissions (no access)
    const defaultPerms = this.getDefaultWorkspacePermissions(false);

    // If user has organization-level admin/owner, grant full access
    if (orgRole) {
      const orgRoleName = orgRole.role.toLowerCase();
      if (["owner", "system_admin", "admin"].includes(orgRoleName)) {
        return this.getDefaultWorkspacePermissions(true);
      }
    }

    // If user has workspace role, use workspace permissions
    if (wsRole && wsRole.permissions) {
      const wsPerms = wsRole.permissions as any;
      return {
        ...defaultPerms,
        ...wsPerms,
      };
    }

    // If user has organization role but no workspace role, use organization permissions
    if (orgRole && orgRole.permissions) {
      const orgPerms = orgRole.permissions as any;
      return {
        ...defaultPerms,
        can_view_workspace: orgPerms.can_view_all_workspaces !== false,
        can_view_members: orgPerms.can_view_users !== false,
        can_view_all_data: orgPerms.can_view_all_organization_data !== false,
      };
    }

    return defaultPerms;
  }

  /**
   * Get organization permissions
   */
  static async getOrganizationPermissions(
    userId: string,
    organizationId: string
  ): Promise<OrganizationPermission> {
    const orgRole = await this.getOrganizationRole(userId, organizationId);

    if (!orgRole) {
      return this.getDefaultOrganizationPermissions(false);
    }

    // Map organization role to permissions
    const roleName = orgRole.role.toLowerCase();
    const hierarchyLevel = orgRole.hierarchyLevel;

    // Use permissions from database if available
    if (orgRole.permissions && Object.keys(orgRole.permissions).length > 0) {
      const orgPerms = orgRole.permissions as any;
      return {
        ...this.getDefaultOrganizationPermissions(false),
        ...orgPerms,
      };
    }

    // Fallback to role-based permissions
    return this.getPermissionsByRole(roleName, hierarchyLevel);
  }

  /**
   * Check specific workspace permission
   */
  static async hasWorkspacePermission(
    userId: string,
    workspaceId: string,
    permission: keyof WorkspacePermission
  ): Promise<boolean> {
    const permissions = await this.getWorkspacePermissions(userId, workspaceId);
    return permissions[permission] === true;
  }

  /**
   * Check specific organization permission
   */
  static async hasOrganizationPermission(
    userId: string,
    organizationId: string,
    permission: keyof OrganizationPermission
  ): Promise<boolean> {
    const permissions = await this.getOrganizationPermissions(
      userId,
      organizationId
    );
    return permissions[permission] === true;
  }

  /**
   * Check if user can manage another user's role
   * User can only assign roles with lower hierarchy level
   */
  static async canManageUserRole(
    currentUserId: string,
    organizationId: string,
    targetRoleId: string
  ): Promise<boolean> {
    const currentRole = await this.getOrganizationRole(
      currentUserId,
      organizationId
    );

    if (!currentRole) {
      return false;
    }

    // Get target role
    const { data: targetRole } = await supabase
      .from("organization_roles")
      .select("hierarchy_level")
      .eq("id", targetRoleId)
      .single();

    if (!targetRole) {
      return false;
    }

    // Current user must have higher hierarchy level
    return currentRole.hierarchyLevel > (targetRole.hierarchy_level || 0);
  }

  /**
   * Check if user can manage workspace role
   */
  static async canManageWorkspaceRole(
    currentUserId: string,
    workspaceId: string,
    targetRoleId: string
  ): Promise<boolean> {
    // Get workspace permissions
    const canManageRoles = await this.hasWorkspacePermission(
      currentUserId,
      workspaceId,
      "can_manage_workspace_settings"
    );

    if (!canManageRoles) {
      return false;
    }

    // Get current user's workspace role
    const currentRole = await this.getWorkspaceRole(currentUserId, workspaceId);
    if (!currentRole) {
      return false;
    }

    // Get target role
    const { data: targetRole } = await supabase
      .from("workspace_roles")
      .select("hierarchy_level")
      .eq("id", targetRoleId)
      .single();

    if (!targetRole) {
      return false;
    }

    // Current user must have higher hierarchy level
    return currentRole.hierarchyLevel > (targetRole.hierarchy_level || 0);
  }

  /**
   * Get default workspace permissions
   */
  private static getDefaultWorkspacePermissions(
    fullAccess: boolean
  ): WorkspacePermission {
    return {
      can_view_workspace: fullAccess,
      can_edit_workspace: fullAccess,
      can_delete_workspace: fullAccess,
      can_manage_workspace_settings: fullAccess,
      can_invite_members: fullAccess,
      can_remove_members: fullAccess,
      can_change_member_roles: fullAccess,
      can_view_members: fullAccess,
      can_create_roles: fullAccess,
      can_edit_roles: fullAccess,
      can_delete_roles: fullAccess,
      can_view_roles: fullAccess,
      can_view_all_data: fullAccess,
      can_edit_all_data: fullAccess,
      can_delete_all_data: fullAccess,
      can_export_data: fullAccess,
    };
  }

  /**
   * Get default organization permissions
   */
  private static getDefaultOrganizationPermissions(
    fullAccess: boolean
  ): OrganizationPermission {
    return {
      can_manage_organization: fullAccess,
      can_delete_organization: fullAccess,
      can_manage_subscription: fullAccess,
      can_view_organization_settings: fullAccess,
      can_invite_users: fullAccess,
      can_remove_users: fullAccess,
      can_change_user_roles: fullAccess,
      can_view_users: fullAccess,
      can_create_workspaces: fullAccess,
      can_delete_workspaces: fullAccess,
      can_manage_all_workspaces: fullAccess,
      can_view_all_workspaces: fullAccess,
      can_view_all_organization_data: fullAccess,
      can_edit_all_organization_data: fullAccess,
      can_export_organization_data: fullAccess,
    };
  }

  /**
   * Get permissions by role name and hierarchy
   */
  private static getPermissionsByRole(
    roleName: string,
    hierarchyLevel: number
  ): OrganizationPermission {
    const perms = this.getDefaultOrganizationPermissions(false);

    // Owner - full access
    if (roleName === "owner" || hierarchyLevel >= 100) {
      return this.getDefaultOrganizationPermissions(true);
    }

    // System Admin - full access except delete organization
    if (roleName === "system_admin" || hierarchyLevel >= 90) {
      return {
        ...this.getDefaultOrganizationPermissions(true),
        can_delete_organization: false,
      };
    }

    // Admin - manage users and workspaces
    if (roleName === "admin" || hierarchyLevel >= 80) {
      return {
        ...perms,
        can_manage_organization: true,
        can_view_organization_settings: true,
        can_invite_users: true,
        can_remove_users: true,
        can_change_user_roles: true,
        can_view_users: true,
        can_create_workspaces: true,
        can_delete_workspaces: true,
        can_manage_all_workspaces: true,
        can_view_all_workspaces: true,
        can_view_all_organization_data: true,
        can_export_organization_data: true,
      };
    }

    // Workspace Admin - manage workspaces only
    if (roleName === "workspace_admin" || hierarchyLevel >= 75) {
      return {
        ...perms,
        can_view_organization_settings: true,
        can_view_users: true,
        can_create_workspaces: true,
        can_manage_all_workspaces: true,
        can_view_all_workspaces: true,
        can_view_all_organization_data: true,
      };
    }

    // Manager - view and manage data
    if (roleName.includes("manager") || hierarchyLevel >= 55) {
      return {
        ...perms,
        can_view_users: true,
        can_view_all_workspaces: true,
        can_view_all_organization_data: true,
        can_export_organization_data: true,
      };
    }

    // Viewer - view only
    if (roleName === "viewer" || hierarchyLevel >= 20) {
      return {
        ...perms,
        can_view_users: true,
        can_view_all_workspaces: true,
        can_view_all_organization_data: true,
      };
    }

    return perms;
  }
}
