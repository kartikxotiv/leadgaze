import { NextRequest, NextResponse } from "next/server";
import {
  createWorkspaceRole,
  getWorkspaceRolesPaginated,
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

    const workspaceRole = await createWorkspaceRole({
      name: body.name,
      permissions: body.permissions,
      created_by: userId,
    });

    return NextResponse.json({
      success: true,
      data: workspaceRole,
    });
  } catch (error: any) {
    console.error("Error creating workspace role:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create workspace role",
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");

    const workspaceRoles = await getWorkspaceRolesPaginated(
      page,
      limit,
      undefined,
      search || undefined
    );

    return NextResponse.json({
      success: true,
      data: workspaceRoles,
    });
  } catch (error: any) {
    console.error("Error getting workspace roles:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get workspace roles",
      },
      { status: 500 }
    );
  }
}
