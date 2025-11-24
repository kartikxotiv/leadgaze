/**
 * RBAC API Helpers
 *
 * Helper functions for protecting API routes with RBAC
 */

import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { RBACService, PermissionContext } from "./rbac-service";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthResult {
  userId: string;
  decoded: any;
}

/**
 * Extract and verify JWT token from request
 */
export async function verifyAuth(
  request: NextRequest
): Promise<AuthResult | NextResponse> {
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
      { success: false, error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  const userId = decoded?.userId || decoded?.user_id;
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Invalid token: missing user ID" },
      { status: 401 }
    );
  }

  return { userId, decoded };
}

/**
 * Check if user has access to organization
 */
export async function requireOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<NextResponse | null> {
  const hasAccess = await RBACService.hasOrganizationAccess(
    userId,
    organizationId
  );

  if (!hasAccess) {
    return NextResponse.json(
      {
        success: false,
        error: "Access denied: You don't have access to this organization",
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Check if user has access to workspace
 */
export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string
): Promise<NextResponse | null> {
  const hasAccess = await RBACService.hasWorkspaceAccess(userId, workspaceId);

  if (!hasAccess) {
    return NextResponse.json(
      {
        success: false,
        error: "Access denied: You don't have access to this workspace",
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Check if user has specific organization permission
 */
export async function requireOrganizationPermission(
  userId: string,
  organizationId: string,
  permission: keyof import("./rbac-service").OrganizationPermission
): Promise<NextResponse | null> {
  const hasPermission = await RBACService.hasOrganizationPermission(
    userId,
    organizationId,
    permission
  );

  if (!hasPermission) {
    return NextResponse.json(
      {
        success: false,
        error: `Access denied: You don't have permission to ${permission}`,
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Check if user has specific workspace permission
 */
export async function requireWorkspacePermission(
  userId: string,
  workspaceId: string,
  permission: keyof import("./rbac-service").WorkspacePermission
): Promise<NextResponse | null> {
  const hasPermission = await RBACService.hasWorkspacePermission(
    userId,
    workspaceId,
    permission
  );

  if (!hasPermission) {
    return NextResponse.json(
      {
        success: false,
        error: `Access denied: You don't have permission to ${permission}`,
      },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Get permission context from request
 */
export async function getPermissionContext(
  request: NextRequest,
  organizationId?: string,
  workspaceId?: string
): Promise<PermissionContext | NextResponse> {
  const authResult = await verifyAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const { userId } = authResult;

  // If organizationId not provided, try to get from request
  if (!organizationId) {
    const url = new URL(request.url);
    organizationId = url.searchParams.get("organizationId") || undefined;
  }

  // If workspaceId not provided, try to get from request params
  if (!workspaceId) {
    const url = new URL(request.url);
    workspaceId = url.searchParams.get("workspaceId") || undefined;
  }

  if (!organizationId) {
    return NextResponse.json(
      { success: false, error: "Organization ID is required" },
      { status: 400 }
    );
  }

  return {
    userId,
    organizationId,
    workspaceId,
  };
}

/**
 * Example usage in API route:
 *
 * export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
 *   // 1. Verify auth
 *   const authResult = await verifyAuth(request);
 *   if (authResult instanceof NextResponse) return authResult;
 *   const { userId } = authResult;
 *
 *   // 2. Get organization ID
 *   const { id } = await params;
 *   const organizationId = id;
 *
 *   // 3. Check organization access
 *   const accessError = await requireOrganizationAccess(userId, organizationId);
 *   if (accessError) return accessError;
 *
 *   // 4. Check specific permission (optional)
 *   const permError = await requireOrganizationPermission(
 *     userId,
 *     organizationId,
 *     "can_view_users"
 *   );
 *   if (permError) return permError;
 *
 *   // 5. Your logic here
 *   return NextResponse.json({ success: true, data: [] });
 * }
 */
