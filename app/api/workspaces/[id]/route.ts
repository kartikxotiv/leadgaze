import { NextRequest, NextResponse } from "next/server";
import {
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
} from "@/lib/data/workspaces";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const workspace = await getWorkspaceById(params.id);

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        organizationId: workspace.organization_id,
        createdAt: workspace.created_at,
        updatedAt: workspace.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error fetching workspace:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch workspace" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const workspace = await updateWorkspace(params.id, {
      name: body.name,
      description: body.description,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        organizationId: workspace.organization_id,
        createdAt: workspace.created_at,
        updatedAt: workspace.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error updating workspace:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update workspace" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    await deleteWorkspace(params.id);

    return NextResponse.json({
      success: true,
      message: "Workspace deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete workspace" },
      { status: 500 }
    );
  }
}

