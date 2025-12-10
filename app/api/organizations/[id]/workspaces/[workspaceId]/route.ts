import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { AuthService } from "@/lib/auth-service";
import { getWorkspaceById, updateWorkspace, deleteWorkspace, getWorkspacesByOrganization } from "@/lib/data/organization-workspaces";
import { getUserById } from "@/lib/data/users";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workspaceId: string }> }
) {
  try {
    const { id, workspaceId } = await params;
    const organizationId = id;

   
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

   
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

   
    const userId = (decoded as any).userId || (decoded as any).user_id;
    const hasAccess = await AuthService.userHasAccessToOrganization(
      userId,
      organizationId
    );

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied to this organization" },
        { status: 403 }
      );
    }

    const workspace = await getWorkspaceById(workspaceId);

    if (!workspace || workspace.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Get creator info
    const creator = workspace.created_by ? await getUserById(workspace.created_by) : null;

    const formattedWorkspace = {
      id: workspace.workspace_id,
      organizationId: workspace.organization_id,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
      status: workspace.status_id || null,
      createdBy: workspace.created_by,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
      creator: creator
        ? {
            id: creator.user_id,
            email: creator.email,
            name: `${creator.first_name} ${creator.last_name}`.trim(),
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      workspace: formattedWorkspace,
    });
  } catch (error) {
    console.error("Error fetching workspace:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch workspace",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workspaceId: string }> }
) {
  try {
    const { id, workspaceId } = await params;
    const organizationId = id;
    const body = await request.json();

   
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

   
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

   
    const userId = (decoded as any).userId || (decoded as any).user_id;
    const userRole = await AuthService.getUserRoleInOrganization(
      userId,
      organizationId
    );

    if (!userRole || !["owner", "admin"].includes(userRole.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to update workspaces",
        },
        { status: 403 }
      );
    }

    const workspace = await getWorkspaceById(workspaceId);

    if (!workspace || workspace.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (body.name && body.name.trim()) {
      updateData.name = body.name.trim();

      // Generate new slug if name changed
      if (updateData.name !== workspace.name) {
        const generateSlug = (name: string): string => {
          return name
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        };

        let slug = generateSlug(updateData.name);
        let counter = 1;

        // Check for existing slug
        const existingWorkspaces = await getWorkspacesByOrganization(organizationId);
        while (existingWorkspaces.some((w: any) => w.slug === slug && w.workspace_id !== workspaceId)) {
          slug = `${generateSlug(updateData.name)}-${counter}`;
          counter++;
        }

        updateData.slug = slug;
      }
    }

    if (body.description !== undefined) {
      updateData.description = body.description?.trim() || null;
    }

    if (body.statusId) {
      updateData.status_id = body.statusId;
    }

    // Update workspace
    const updatedWorkspace = await updateWorkspace(workspaceId, updateData);

    // Get creator info
    const creator = updatedWorkspace.created_by ? await getUserById(updatedWorkspace.created_by) : null;

    const formattedWorkspace = {
      id: updatedWorkspace.workspace_id,
      organizationId: updatedWorkspace.organization_id,
      name: updatedWorkspace.name,
      slug: updatedWorkspace.slug,
      description: updatedWorkspace.description,
      status: updatedWorkspace.status_id,
      createdBy: updatedWorkspace.created_by,
      createdAt: updatedWorkspace.created_at,
      updatedAt: updatedWorkspace.updated_at,
      creator: creator
        ? {
            id: creator.user_id,
            email: creator.email,
            name: `${creator.first_name} ${creator.last_name}`.trim(),
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      message: "Workspace updated successfully",
      workspace: formattedWorkspace,
    });
  } catch (error) {
    console.error("Error updating workspace:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update workspace",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; workspaceId: string }> }
) {
  try {
    const { id, workspaceId } = await params;
    const organizationId = id;

   
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

   
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

   
    const userId = (decoded as any).userId || (decoded as any).user_id;
    const userRole = await AuthService.getUserRoleInOrganization(
      userId,
      organizationId
    );

    if (!userRole || !["owner", "admin"].includes(userRole.toLowerCase())) {
      return NextResponse.json(
        {
          success: false,
          error: "Insufficient permissions to delete workspaces",
        },
        { status: 403 }
      );
    }

    const workspace = await getWorkspaceById(workspaceId);

    if (!workspace || workspace.organization_id !== organizationId) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Archive workspace (update status_id or delete based on requirements)
    await updateWorkspace(workspaceId, { status_id: null }); // Or set to archived status_id if exists

    return NextResponse.json({
      success: true,
      message: "Workspace archived successfully",
    });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete workspace",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
