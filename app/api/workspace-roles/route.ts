import { NextRequest, NextResponse } from "next/server";
import {
  createWorkspaceRole,
  getWorkspaceRolesPaginated,
  getWorkspaceRolesByWorkspaceId,
} from "@/lib/data/workspace-roles";
import { AuthService } from "@/lib/auth-service";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: NextRequest) {
  try {
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
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON in request body. Please check your JSON format.",
        },
        { status: 400 }
      );
    }

    const requiredFields = ["name", "permissions"];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const userId = decoded?.userId || decoded?.user_id;

    // Get user's organizations to check role
    const userOrganizations = await AuthService.getUserOrganizations(userId);
    if (!userOrganizations || userOrganizations.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not associated with any organization" },
        { status: 403 }
      );
    }

    // Check if user is admin or owner in any organization
    const hasPermission = userOrganizations.some((org: any) => {
      const role = org.role?.toLowerCase();
      return ["owner", "admin"].includes(role);
    });

    if (!hasPermission) {
      return NextResponse.json(
        {
          success: false,
          error: "Only Administrators and Owners can create roles",
        },
        { status: 403 }
      );
    }

    // Note: workspace_roles table no longer has workspace_id column
    // Roles are now global. workspace_id is ignored if provided.
    console.log("Creating workspace role:", {
      name: body.name,
      permissionsKeys: Object.keys(body.permissions || {}),
      permissionsCount: Object.keys(body.permissions || {}).length,
      userId,
    });

    // Validate permissions structure
    if (typeof body.permissions !== "object" || body.permissions === null) {
      return NextResponse.json(
        {
          success: false,
          error: "Permissions must be an object",
        },
        { status: 400 }
      );
    }

    // Log permissions structure for debugging
    console.log(
      "Permissions structure:",
      JSON.stringify(body.permissions, null, 2)
    );

    const workspaceRole = await createWorkspaceRole({
      name: body.name,
      permissions: body.permissions,
      created_by: userId,
    });

    console.log("Workspace role created successfully:", {
      id: workspaceRole?.id,
      name: workspaceRole?.name,
    });

    return NextResponse.json({
      success: true,
      data: workspaceRole,
    });
  } catch (error: any) {
    console.error("Error creating workspace role:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack,
    });

    const errorMessage = error?.message || "Failed to create workspace role";
    const errorCode = error?.code;
    const errorDetails = error?.details;
    const errorHint = error?.hint;

    // Provide more specific error messages
    if (errorCode === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "A role with this name already exists",
        },
        { status: 400 }
      );
    }

    if (
      errorCode === "42501" ||
      errorMessage.includes("permission denied") ||
      errorMessage.includes("row-level security")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Permission denied. Please check your database RLS policies.",
          hint: errorHint,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
        hint: errorHint,
      },
      { status: 500 }
    );
  }
}
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    try {
      jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const showAll = searchParams.get("showAll") === "true"; // New parameter to show all roles
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");

    // If workspaceId is provided AND showAll is not true, get roles for that workspace
    // Otherwise, get all paginated roles
    if (workspaceId && !showAll) {
      const workspaceRoles = await getWorkspaceRolesByWorkspaceId(workspaceId);
      return NextResponse.json({
        success: true,
        roles: workspaceRoles,
        total: workspaceRoles.length,
      });
    }

    // Get all paginated roles (either no workspaceId or showAll=true)
    console.log("Fetching workspace roles:", {
      page,
      limit,
      search,
      showAll,
      workspaceId,
    });

    const workspaceRoles = await getWorkspaceRolesPaginated(
      page,
      limit,
      undefined,
      search || undefined
    );

    console.log("Fetched workspace roles:", {
      count: workspaceRoles?.data?.length || 0,
      total: workspaceRoles?.count || 0,
    });

    return NextResponse.json({
      success: true,
      data: workspaceRoles,
    });
  } catch (error: any) {
    console.error("Error getting workspace roles:", error);
    const errorMessage = error?.message || "Failed to get workspace roles";
    const errorCode = error?.code;

    // Provide more specific error messages
    if (errorCode === "42P01" || errorMessage.includes("does not exist")) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The workspace_roles table does not exist. Please run database migrations.",
        },
        { status: 500 }
      );
    }

    if (
      errorCode === "42501" ||
      errorMessage.includes("permission denied") ||
      errorMessage.includes("row-level security")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Permission denied. Please check your database RLS policies.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
