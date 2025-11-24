import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { RBACService } from "@/lib/rbac/rbac-service";
import { getWorkspaceById } from "@/lib/data/workspaces";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = id;

    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const userId = decoded?.userId || decoded?.user_id;

    // Verify workspace exists
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Get workspace role and permissions
    const workspaceRole = await RBACService.getWorkspaceRole(
      userId,
      workspaceId
    );

    // Get workspace permissions (general permissions)
    const permissions = await RBACService.getWorkspacePermissions(
      userId,
      workspaceId
    );

    // Get route-specific permissions from workspace role
    // Permissions structure: { "Sales Contacts": { visible, view, create, update, delete }, ... }
    let routePermissions: Record<
      string,
      {
        visible: boolean;
        view: boolean;
        create: boolean;
        update: boolean;
        delete: boolean;
      }
    > = {};

    if (workspaceRole && workspaceRole.permissions) {
      // The permissions field is a JSONB object with route names as keys
      const rolePermissions = workspaceRole.permissions as any;

      console.log("[my-permissions API] Raw workspace role permissions:", {
        roleName: workspaceRole.name,
        roleId: workspaceRole.roleId,
        permissionsType: typeof rolePermissions,
        permissionsIsObject: typeof rolePermissions === "object",
        permissionsKeys: rolePermissions ? Object.keys(rolePermissions) : [],
        permissionsValue: JSON.stringify(rolePermissions, null, 2),
      });

      // Check if permissions are route-based (object with route names as keys)
      // or general permissions (flat object with can_* fields)
      if (
        rolePermissions &&
        typeof rolePermissions === "object" &&
        !Array.isArray(rolePermissions)
      ) {
        // Check if it's route-based (has route-like keys)
        const keys = Object.keys(rolePermissions);
        console.log("[my-permissions API] Checking route-based permissions:", {
          keys,
          keysCount: keys.length,
        });

        // Check if any key has route-based structure
        // Route-based structure: { "Sales Leads Route": { visible: true, view: true, ... } }
        // General structure: { can_view_all_data: true, can_edit_all_data: false, ... }
        const isRouteBased =
          keys.length > 0 &&
          keys.some((key) => {
            const perm = rolePermissions[key];
            // Check if it's an object with route permission fields
            const hasRouteStructure =
              perm &&
              typeof perm === "object" &&
              !Array.isArray(perm) &&
              ("view" in perm ||
                "visible" in perm ||
                "create" in perm ||
                "update" in perm ||
                "delete" in perm);

            console.log("[my-permissions API] Checking key:", {
              key,
              perm,
              hasRouteStructure,
              permType: typeof perm,
              isArray: Array.isArray(perm),
              permKeys:
                perm && typeof perm === "object" && !Array.isArray(perm)
                  ? Object.keys(perm)
                  : [],
            });

            return hasRouteStructure;
          });

        // Also check if keys look like route names (contain "Route" or match known route patterns)
        const looksLikeRoutes = keys.some((key) => {
          const lowerKey = key.toLowerCase();
          return (
            lowerKey.includes("route") ||
            lowerKey.includes("sales") ||
            lowerKey.includes("leads") ||
            lowerKey.includes("contacts") ||
            lowerKey.includes("user") ||
            lowerKey.includes("team")
          );
        });

        console.log("[my-permissions API] Permission detection:", {
          isRouteBased,
          looksLikeRoutes,
          keys,
        });

        if (isRouteBased || (looksLikeRoutes && keys.length > 0)) {
          // Route-based permissions structure
          routePermissions = rolePermissions;
          console.log("[my-permissions API] Using route-based permissions:", {
            routePermissionsKeys: Object.keys(routePermissions),
            routePermissionsCount: Object.keys(routePermissions).length,
            routePermissions,
          });
        } else {
          // General permissions structure - convert to route permissions if needed
          // For now, return empty and let frontend handle based on general permissions
          routePermissions = {};
          console.log(
            "[my-permissions API] Not route-based, using empty routePermissions. Keys:",
            keys
          );
        }
      } else {
        console.log(
          "[my-permissions API] Permissions is not an object or is null:",
          {
            rolePermissions,
            type: typeof rolePermissions,
            isArray: Array.isArray(rolePermissions),
          }
        );
      }

      console.log("[my-permissions API] Final workspace role permissions:", {
        roleName: workspaceRole.name,
        roleId: workspaceRole.roleId,
        hasPermissions: !!workspaceRole.permissions,
        permissionsKeys: Object.keys(routePermissions),
        permissionsSample: routePermissions,
      });
    } else {
      console.log("[my-permissions API] No workspace role found for user:", {
        userId,
        workspaceId,
        hasWorkspaceRole: !!workspaceRole,
        hasPermissions: workspaceRole ? !!workspaceRole.permissions : false,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        workspaceId,
        workspaceRole: workspaceRole
          ? {
              roleId: workspaceRole.roleId,
              name: workspaceRole.name,
              hierarchyLevel: workspaceRole.hierarchyLevel,
            }
          : null,
        permissions,
        routePermissions,
      },
    });
  } catch (error: any) {
    console.error("Error fetching workspace permissions:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch workspace permissions",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
