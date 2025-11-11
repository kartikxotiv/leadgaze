import { NextRequest, NextResponse } from "next/server";
import { createWorkspaceRole, getWorkspaceRolesPaginated } from "@/lib/data/workspace-roles";
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
          error: "Invalid JSON in request body. Please check your JSON format." 
        },
        { status: 400 }
      );
    }

    const requiredFields = ["name", "workspaceId", "permissions", "hierarchy_level"];
    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const userId = decoded?.userId || decoded?.user_id;
    
    const workspaceRole = await createWorkspaceRole({
      name: body.name,
      description: body.description,
      permissions: body.permissions,
      hierarchy_level: body.hierarchy_level,
      workspace_id: body.workspaceId,
      created_by: userId,
    });

    return NextResponse.json({
      success: true,
      data: workspaceRole,
    });
  } catch (error: any) {
    console.error("Error creating workspace role:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create workspace role" },
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
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search");
    
    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID is required" },
        { status: 400 }
      );
    }

    const workspaceRoles = await getWorkspaceRolesPaginated(
      workspaceId, 
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
      { success: false, error: error.message || "Failed to get workspace roles" },
      { status: 500 }
    );
  }
}