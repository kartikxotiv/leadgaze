import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { AuthService } from "@/lib/auth-service";
import { OrganizationWorkspace, User } from "@/models";
import { Op } from "sequelize";

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

   
    const workspace = await OrganizationWorkspace.findOne({
      where: {
        id: workspaceId,
        organizationId: organizationId,
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["userId", "email", "firstName", "lastName"],
        },
      ],
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

   
    const formattedWorkspace = {
      id: (workspace as any).id,
      organizationId: (workspace as any).organizationId,
      name: (workspace as any).name,
      slug: (workspace as any).slug,
      description: (workspace as any).description,
      status: (workspace as any).status || (workspace as any).statusId || null,
      createdBy: (workspace as any).createdBy,
      createdAt: (workspace as any).createdAt,
      updatedAt: (workspace as any).updatedAt,
      creator: (workspace as any).creator
        ? {
            id: (workspace as any).creator.userId,
            email: (workspace as any).creator.email,
            name: `${(workspace as any).creator.firstName} ${
              (workspace as any).creator.lastName
            }`.trim(),
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

   
    const workspace = await OrganizationWorkspace.findOne({
      where: {
        id: workspaceId,
        organizationId: organizationId,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

   
    const updateData: any = {};

    if (body.name && body.name.trim()) {
      updateData.name = body.name.trim();

     
      if (updateData.name !== (workspace as any).name) {
        const generateSlug = (name: string): string => {
          return name
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s_-]+/g, "-")
            .replace(/^-+|-+$/g, "");
        };

        let slug = generateSlug(updateData.name);
        let counter = 1;

       
        while (
          await OrganizationWorkspace.findOne({
            where: {
              organizationId,
              slug,
              id: { [Op.ne]: workspaceId },
            },
          })
        ) {
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
      updateData.statusId = body.statusId;
    }

   
    await workspace.update(updateData);

   
    const updatedWorkspace = await OrganizationWorkspace.findByPk(workspaceId, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["userId", "email", "firstName", "lastName"],
        },
      ],
    });

   
    const formattedWorkspace = {
      id: (updatedWorkspace as any).id,
      organizationId: (updatedWorkspace as any).organizationId,
      name: (updatedWorkspace as any).name,
      slug: (updatedWorkspace as any).slug,
      description: (updatedWorkspace as any).description,
      status: (updatedWorkspace as any).status,
      createdBy: (updatedWorkspace as any).createdBy,
      createdAt: (updatedWorkspace as any).createdAt,
      updatedAt: (updatedWorkspace as any).updatedAt,
      creator: (updatedWorkspace as any).creator
        ? {
            id: (updatedWorkspace as any).creator.userId,
            email: (updatedWorkspace as any).creator.email,
            name: `${(updatedWorkspace as any).creator.firstName} ${
              (updatedWorkspace as any).creator.lastName
            }`.trim(),
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

   
    const workspace = await OrganizationWorkspace.findOne({
      where: {
        id: workspaceId,
        organizationId: organizationId,
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

   
    await workspace.update({ status: "archived" });

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
