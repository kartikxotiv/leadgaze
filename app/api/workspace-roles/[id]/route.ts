import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceRoleById, updateWorkspaceRole, deleteWorkspaceRole } from "@/lib/data/workspace-roles";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authorization
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

    const { id } = await params;
    const workspaceRole = await getWorkspaceRoleById(id);

    if (!workspaceRole) {
      return NextResponse.json(
        { success: false, error: "Workspace role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: workspaceRole,
    });
  } catch (error: any) {
    console.error("Error fetching workspace role:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch workspace role" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authorization
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

    const { id } = await params;

    // Parse and validate request body
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

    // Check if role exists
    const existingRole = await getWorkspaceRoleById(id);
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: "Workspace role not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.permissions !== undefined) updateData.permissions = body.permissions;
    if (body.hierarchy_level !== undefined) updateData.hierarchy_level = body.hierarchy_level;

    const workspaceRole = await updateWorkspaceRole(id, updateData);

    return NextResponse.json({
      success: true,
      data: workspaceRole,
    });
  } catch (error: any) {
    console.error("Error updating workspace role:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update workspace role" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authorization
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

    const { id } = await params;

    // Check if role exists
    const existingRole = await getWorkspaceRoleById(id);
    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: "Workspace role not found" },
        { status: 404 }
      );
    }

    const workspaceRole = await deleteWorkspaceRole(id);

    return NextResponse.json({
      success: true,
      data: workspaceRole,
      message: "Workspace role deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting workspace role:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete workspace role" },
      { status: 500 }
    );
  }
}

