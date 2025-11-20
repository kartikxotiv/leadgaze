import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  getWorkspaceInvitesByWorkspaceId,
  createWorkspaceInvite,
  getWorkspaceInvitesPaginated,
} from "@/lib/data/workspace-invites";
import { getWorkspaceById } from "@/lib/data/workspaces";
import { AuthService } from "@/lib/auth-service";
import { supabase } from "@/lib/supabase-client";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspaceId = id;

    // Verify authorization
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

    const userId = decoded?.userId || decoded?.user_id;

    // Verify workspace exists and user has access
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user has access to the organization
    const hasAccess = await AuthService.userHasAccessToOrganization(
      userId,
      workspace.organization_id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      );
    }

    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    // Build filters
    const filters: Record<string, any> = {};
    if (status) {
      filters.status = status;
    }

    // Get workspace invites
    let invites;
    if (page && limit) {
      invites = await getWorkspaceInvitesPaginated(
        workspaceId,
        page,
        limit,
        Object.keys(filters).length > 0 ? filters : undefined,
        search || undefined
      );
    } else {
      const allInvites = await getWorkspaceInvitesByWorkspaceId(workspaceId);
      invites = {
        data: allInvites,
        total: allInvites.length,
        page: 1,
        limit: allInvites.length,
        totalPages: 1,
      };
    }

    // Format response
    const formattedInvites = invites.data.map((invite) => ({
      id: invite.id,
      email: invite.email,
      workspaceId: invite.workspace_id,
      roleId: invite.role_id,
      invitedBy: invite.invited_by,
      status: invite.status,
      createdAt: invite.created_at,
      updatedAt: invite.updated_at,
      workspace: invite.workspace
        ? {
            id: invite.workspace.id,
            name: invite.workspace.name,
            description: invite.workspace.description,
          }
        : null,
      role: invite.role
        ? {
            id: invite.role.id,
            name: invite.role.name,
            permissions: invite.role.permissions,
          }
        : null,
      invitedByUser: invite.invited_by_user
        ? {
            userId: invite.invited_by_user.user_id,
            firstName: invite.invited_by_user.first_name,
            lastName: invite.invited_by_user.last_name,
            email: invite.invited_by_user.email,
            fullName: `${invite.invited_by_user.first_name} ${invite.invited_by_user.last_name}`,
          }
        : null,
    }));

    return NextResponse.json({
      success: true,
      invites: formattedInvites,
      pagination: {
        total: invites.total,
        page: invites.page,
        limit: invites.limit,
        totalPages: invites.totalPages,
      },
    });
  } catch (error: any) {
    console.error("Error fetching workspace invites:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch workspace invites",
        details: error.message || "Unknown error",
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
    const workspaceId = id;

    const body = await request.json();
    const { email, roleId, status } = body;

    // Validate required fields
    if (!email || !roleId) {
      return NextResponse.json(
        { success: false, error: "email and roleId are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !["pending", "accepted", "rejected"].includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid status. Must be: pending, accepted, or rejected",
        },
        { status: 400 }
      );
    }

    // Verify authorization
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

    const currentUserId = decoded?.userId || decoded?.user_id;

    // Verify workspace exists and user has access
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      return NextResponse.json(
        { success: false, error: "Workspace not found" },
        { status: 404 }
      );
    }

    // Check if user has access to the organization
    const hasAccess = await AuthService.userHasAccessToOrganization(
      currentUserId,
      workspace.organization_id
    );

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied to this workspace" },
        { status: 403 }
      );
    }

    // Verify the role exists
    const { data: role, error: roleError } = await supabase
      .from("workspace_roles")
      .select("id")
      .eq("id", roleId)
      .eq("is_deleted", false)
      .single();

    if (roleError || !role) {
      return NextResponse.json(
        { success: false, error: "Invalid role or role does not exist" },
        { status: 400 }
      );
    }

    // Check if invite already exists for this email and workspace
    const { data: existingInvite } = await supabase
      .from("workspace_invites")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .eq("workspace_id", workspaceId)
      .single();

    if (existingInvite) {
      // If invite exists and is pending, return error
      if (existingInvite.status === "pending") {
        return NextResponse.json(
          {
            success: false,
            error: "Pending invite already exists for this email",
          },
          { status: 400 }
        );
      }
      // If invite was accepted or rejected, allow creating a new one
    }

    // Create workspace invite
    const invite = await createWorkspaceInvite({
      email: email.toLowerCase().trim(),
      workspace_id: workspaceId,
      role_id: roleId,
      invited_by: currentUserId,
      status: (status || "pending") as "pending" | "accepted" | "rejected",
    });

    return NextResponse.json({
      success: true,
      message: "Invite created successfully",
      invite: {
        id: invite.id,
        email: invite.email,
        workspaceId: invite.workspace_id,
        roleId: invite.role_id,
        invitedBy: invite.invited_by,
        status: invite.status,
        createdAt: invite.created_at,
        updatedAt: invite.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error creating workspace invite:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create workspace invite",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
