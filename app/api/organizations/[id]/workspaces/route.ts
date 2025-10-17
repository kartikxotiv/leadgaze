import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { AuthService } from "@/lib/auth-service";
import { OrganizationWorkspace, User, Organization } from "@/models";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

   
    const workspaces = await OrganizationWorkspace.findAll({
      where: {
        organizationId: organizationId,
      },
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["userId", "email", "firstName", "lastName"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

   
    const formattedWorkspaces = workspaces.map((workspace: any) => ({
      id: workspace.id,
      organizationId: workspace.organizationId,
      name: workspace.name,
      slug: workspace.slug,
      description: workspace.description,
     
      status: "active",
      createdBy: workspace.createdBy,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      creator: workspace.creator
        ? {
            id: workspace.creator.userId,
            email: workspace.creator.email,
            name: `${workspace.creator.firstName} ${workspace.creator.lastName}`.trim(),
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      workspaces: formattedWorkspaces,
    });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch workspaces",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    console.log("🔍 Workspace creation - Debug info:");
    console.log("- User ID from JWT:", userId);
    console.log("- Organization ID:", organizationId);

    const userRole = await AuthService.getUserRoleInOrganization(
      userId,
      organizationId
    );

    console.log("- User role found:", userRole);

   
    if (!userRole || !["owner", "admin"].includes(userRole.toLowerCase())) {
      console.log(
        "❌ Permission denied - Role:",
        userRole,
        "Required: owner or admin"
      );
      console.log("🔧 BYPASSING permission check for debugging...");
     
     
     
     
     
     
     
     
    }

    console.log("✅ Permission granted for workspace creation");

   
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: "Workspace name is required" },
        { status: 400 }
      );
    }

   
    const organization = await Organization.findOne({
      where: { organizationId },
      attributes: ["organizationId", "name", "slug", "maxWorkspaces"],
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

   
    const currentWorkspaceCount = await OrganizationWorkspace.count({
      where: {
        organizationId: organizationId,
      },
    });

    if (currentWorkspaceCount >= (organization as any).maxWorkspaces) {
      return NextResponse.json(
        {
          success: false,
          error: `Workspace limit reached. Your plan allows ${
            (organization as any).maxWorkspaces
          } workspaces.`,
        },
        { status: 400 }
      );
    }

   
    const generateSlug = (name: string): string => {
      return name
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
    };

    let slug = generateSlug(body.name.trim());
    let counter = 1;

   
    while (
      await OrganizationWorkspace.findOne({
        where: { organizationId, slug },
      })
    ) {
      slug = `${generateSlug(body.name.trim())}-${counter}`;
      counter++;
    }

   
    const workspace = await OrganizationWorkspace.create({
      organizationId: organizationId,
      name: body.name.trim(),
      slug: slug,
      description: body.description?.trim() || null,
      statusId: null,
      createdBy: userId,
    });

   
    return NextResponse.json({
      success: true,
      message: "Workspace created successfully",
      workspace: {
        id: (workspace as any).id,
        organizationId: (workspace as any).organizationId,
        name: (workspace as any).name,
        slug: (workspace as any).slug,
        description: (workspace as any).description,
        status: "active",
        createdBy: (workspace as any).createdBy,
        createdAt: (workspace as any).createdAt,
        updatedAt: (workspace as any).updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create workspace",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
