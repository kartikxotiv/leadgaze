import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { useMemo } from "react";

export interface RoutePermission {
  visible: boolean;
  view: boolean;
  create: boolean;
  update: boolean;
  delete: boolean;
}

export interface WorkspacePermissionsData {
  workspaceId: string;
  workspaceRole: {
    roleId: string;
    name: string;
    hierarchyLevel: number;
  } | null;
  permissions: Record<string, boolean>;
  routePermissions: Record<string, RoutePermission>;
}

/**
 * Hook to get current user's workspace permissions
 */
export function useWorkspacePermissions() {
  const { token, user } = useAuthStore();
  const { currentWorkspace } = useWorkspaceContext();

  return useQuery<WorkspacePermissionsData>({
    queryKey: ["workspace-permissions", currentWorkspace?.id, user?.userId],
    enabled: !!currentWorkspace?.id && !!token && !!user?.userId,
    queryFn: async () => {
      if (!currentWorkspace?.id || !token) {
        throw new Error("Workspace or token not available");
      }

      console.log(
        "[useWorkspacePermissions] Fetching permissions for workspace:",
        {
          workspaceId: currentWorkspace.id,
          userId: user?.userId,
        }
      );

      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/my-permissions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch workspace permissions");
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(
          result.error || "Failed to fetch workspace permissions"
        );
      }

      console.log("[useWorkspacePermissions] Permissions loaded:", {
        workspaceId: result.data.workspaceId,
        hasRoutePermissions: !!result.data.routePermissions,
        routePermissionsKeys: Object.keys(result.data.routePermissions || {}),
        routePermissions: result.data.routePermissions,
      });

      return result.data;
    },
    staleTime: 0, // Don't cache - always refetch when workspace changes
    refetchOnWindowFocus: false,
  });
}

/**
 * Helper hook to check if user has permission for a specific route and action
 */
export function useWorkspaceRoutePermission(
  route: string,
  action: "view" | "create" | "update" | "delete" | "visible"
) {
  const { data: permissionsData } = useWorkspacePermissions();
  const { currentOrganization } = useAuthStore();

  // Check if user is organization admin/owner - they have all permissions
  const isAdminOrOwner = useMemo(() => {
    if (!currentOrganization) return false;
    const userRole = currentOrganization.role?.toLowerCase();
    return ["owner", "system_admin", "admin"].includes(userRole || "");
  }, [currentOrganization]);

  if (isAdminOrOwner) {
    // Organization admins/owners have all permissions
    return true;
  }

  if (!permissionsData) {
    // If no permissions data loaded yet, default to false for security
    return false;
  }

  // If user has general workspace permissions, grant access
  if (permissionsData.permissions) {
    // If can_view_all_data or can_edit_all_data, grant view permissions
    if (action === "view" || action === "visible") {
      if (
        permissionsData.permissions.can_view_all_data ||
        permissionsData.permissions.can_edit_all_data
      ) {
        return true;
      }
    }
    // If can_edit_all_data, grant create/update permissions
    if (action === "create" || action === "update") {
      if (permissionsData.permissions.can_edit_all_data) {
        return true;
      }
    }
    // If can_delete_all_data, grant delete permission
    if (action === "delete") {
      if (permissionsData.permissions.can_delete_all_data) {
        return true;
      }
    }
  }

  // Check route-specific permissions
  if (
    !permissionsData.routePermissions ||
    Object.keys(permissionsData.routePermissions).length === 0
  ) {
    // No route permissions defined, default to false
    console.log(
      "[useWorkspaceRoutePermission] No route permissions found for route:",
      route
    );
    return false;
  }

  // Try exact match first
  let routePermission = permissionsData.routePermissions[route];

  // If not found, try matching with "Route" suffix (e.g., "Sales Contacts" -> "Sales Contacts Route")
  if (!routePermission && route !== `${route} Route`) {
    routePermission = permissionsData.routePermissions[`${route} Route`];
  }

  // If still not found, check if route matches any key (case-insensitive)
  if (!routePermission) {
    const routeLower = route.toLowerCase();
    const matchingKey = Object.keys(permissionsData.routePermissions).find(
      (key) =>
        key.toLowerCase() === routeLower ||
        key.toLowerCase() === `${routeLower} route`
    );
    if (matchingKey) {
      routePermission = permissionsData.routePermissions[matchingKey];
      console.log(
        "[useWorkspaceRoutePermission] Found route permission with case-insensitive match:",
        matchingKey
      );
    }
  }

  if (!routePermission) {
    // If no specific route permission found, default to false
    console.log("[useWorkspaceRoutePermission] Route permission not found:", {
      route,
      availableRoutes: Object.keys(permissionsData.routePermissions),
    });
    return false;
  }

  console.log("[useWorkspaceRoutePermission] Route permission found:", {
    route,
    permission: routePermission,
    action,
    hasAction: action in routePermission,
    actionValue: routePermission[action],
  });

  // Check the specific action permission
  // Ensure the permission object has the action field
  if (typeof routePermission !== "object" || !(action in routePermission)) {
    return false;
  }

  return routePermission[action] === true;
}
