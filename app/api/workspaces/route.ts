import { NextRequest, NextResponse } from "next/server";
import {
  getWorkspacesPaginated,
  createWorkspace,
  getWorkspaceById,
} from "@/lib/data/workspaces";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
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

    try {
      const decoded: any = jwt.verify(authHeader.substring(7), JWT_SECRET);
      const hasOrgAccess = Array.isArray(decoded?.availableOrganizations)
        ? decoded.availableOrganizations.some(
            (o: any) => o.id === organizationId
          )
        : decoded?.currentOrganizationId === organizationId;
      if (!hasOrgAccess) {
        return NextResponse.json(
          { success: false, error: "Access denied to this organization" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const result = await getWorkspacesPaginated(
      organizationId,
      page,
      limit,
      undefined,
      search || undefined
    );

    // Transform snake_case to camelCase
    const transformedWorkspaces = (result.data || []).map((workspace: any) => ({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      organizationId: workspace.organization_id,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
      organization: workspace.organization,
    }));

    return NextResponse.json({
      success: true,
      data: {
        workspaces: transformedWorkspaces,
        pagination: {
          count: result.count,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching workspaces:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Validate required fields
    const requiredFields = ["name", "organizationId"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    try {
      const decoded: any = jwt.verify(authHeader.substring(7), JWT_SECRET);
      const hasOrgAccess = Array.isArray(decoded?.availableOrganizations)
        ? decoded.availableOrganizations.some(
            (o: any) => o.id === body.organizationId
          )
        : decoded?.currentOrganizationId === body.organizationId;
      if (!hasOrgAccess) {
        return NextResponse.json(
          { success: false, error: "Access denied to this organization" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Create workspace
    const workspace = await createWorkspace({
      name: body.name,
      description: body.description,
      organization_id: body.organizationId,
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
    console.error("Error creating workspace:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create workspace" },
      { status: 500 }
    );
  }
}

