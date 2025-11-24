import { NextRequest, NextResponse } from "next/server";
import {
  getWorkspacesPaginated,
  createWorkspace,
  getWorkspaceById,
  getWorkspacesByUserId,
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

    let decoded: any;
    let userId: string | undefined;
    try {
      decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
      userId = decoded?.userId || decoded?.user_id;

      // Check if user has access to the requested organization
      // But allow if user is a member of workspaces in other organizations
      const hasOrgAccess = Array.isArray(decoded?.availableOrganizations)
        ? decoded.availableOrganizations.some(
            (o: any) => o.id === organizationId
          )
        : decoded?.currentOrganizationId === organizationId;

      // Note: We don't block here even if user doesn't have org access
      // because they might be a member of workspaces in other orgs
      // We'll filter the results appropriately below
      if (!hasOrgAccess) {
        console.log(
          `[Workspaces API] User ${userId} doesn't have direct access to org ${organizationId}, but will check for member workspaces`
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Get workspaces where user is a member (this includes workspaces from all organizations)
    let userMemberWorkspaces: any[] = [];
    if (userId) {
      try {
        const memberWorkspaces = await getWorkspacesByUserId(userId);
        userMemberWorkspaces = memberWorkspaces || [];
        console.log(
          `[Workspaces API] Found ${userMemberWorkspaces.length} workspaces where user ${userId} is a member`
        );
      } catch (error: any) {
        console.error(
          "[Workspaces API] Failed to fetch user member workspaces:",
          error?.message || error
        );
        // Continue without user member workspaces if there's an error
      }
    } else {
      console.warn("[Workspaces API] No userId found in token");
    }

    // Get workspaces for the current organization (if user has access)
    let orgWorkspaces: any[] = [];
    const hasOrgAccess = Array.isArray(decoded?.availableOrganizations)
      ? decoded.availableOrganizations.some((o: any) => o.id === organizationId)
      : decoded?.currentOrganizationId === organizationId;

    if (hasOrgAccess) {
      try {
        const orgResult = await getWorkspacesPaginated(
          organizationId,
          page,
          limit,
          undefined,
          search || undefined
        );
        orgWorkspaces = orgResult.data || [];
        console.log(
          `[Workspaces API] Found ${orgWorkspaces.length} workspaces for organization ${organizationId}`
        );
      } catch (error: any) {
        console.error(
          "[Workspaces API] Failed to fetch organization workspaces:",
          error?.message || error
        );
      }
    }

    // Combine and deduplicate workspaces
    const workspaceMap = new Map();

    // Add organization workspaces first
    orgWorkspaces.forEach((ws: any) => {
      workspaceMap.set(ws.id, ws);
    });

    // Add user member workspaces (will overwrite duplicates, which is fine)
    // This ensures workspaces from other organizations are included
    userMemberWorkspaces.forEach((ws: any) => {
      workspaceMap.set(ws.id, ws);
    });

    console.log(
      `[Workspaces API] Combined ${workspaceMap.size} unique workspaces (${orgWorkspaces.length} from org, ${userMemberWorkspaces.length} from memberships)`
    );

    // Apply search filter if provided (after combining)
    let allWorkspaces = Array.from(workspaceMap.values());
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      allWorkspaces = allWorkspaces.filter(
        (ws: any) =>
          ws.name?.toLowerCase().includes(searchLower) ||
          ws.description?.toLowerCase().includes(searchLower)
      );
    }

    // Sort by created_at descending
    allWorkspaces.sort(
      (a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedWorkspaces = allWorkspaces.slice(startIndex, endIndex);

    // Transform snake_case to camelCase
    const transformedWorkspaces = paginatedWorkspaces.map((workspace: any) => ({
      id: workspace.id,
      name: workspace.name,
      description: workspace.description,
      organizationId: workspace.organization_id,
      userId: workspace.user_id,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
      organization: workspace.organization
        ? {
            organizationId: workspace.organization.organization_id,
            id: workspace.organization.organization_id,
            name: workspace.organization.name,
            slug: workspace.organization.slug,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        workspaces: transformedWorkspaces,
        pagination: {
          count: allWorkspaces.length,
          page: page,
          limit: limit,
          totalPages: Math.ceil(allWorkspaces.length / limit),
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
          error: "Invalid JSON in request body. Please check your JSON format.",
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

    let decoded: any;
    let userId: string | undefined;
    try {
      decoded = jwt.verify(authHeader.substring(7), JWT_SECRET) as any;
      userId = decoded?.userId || decoded?.user_id;
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
      user_id: userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        organizationId: workspace.organization_id,
        userId: workspace.user_id,
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
