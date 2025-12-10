import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  getWorkspaceInviteById,
  updateWorkspaceInvite,
  deleteWorkspaceInvite,
} from "@/lib/data/workspace-invites";
import { getWorkspaceById } from "@/lib/data/workspaces";
import { AuthService } from "@/lib/auth-service";
import { supabase } from "@/lib/supabase-client";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const { id, inviteId } = await params;
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

    // Get invite
    const invite = await getWorkspaceInviteById(inviteId);
    if (!invite) {
      return NextResponse.json(
        { success: false, error: "Invite not found" },
        { status: 404 }
      );
    }

    // Verify invite belongs to this workspace
    if (invite.workspace_id !== workspaceId) {
      return NextResponse.json(
        { success: false, error: "Invite does not belong to this workspace" },
        { status: 400 }
      );
    }

    // Format response
    const formattedInvite = {
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
    };

    return NextResponse.json({
      success: true,
      invite: formattedInvite,
    });
  } catch (error: any) {
    console.error("Error fetching workspace invite:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch workspace invite",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const { id, inviteId } = await params;
    const workspaceId = id;

    const body = await request.json();
    const { email, roleId, status } = body;

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

    // Get existing invite
    const existingInvite = await getWorkspaceInviteById(inviteId);
    if (!existingInvite) {
      return NextResponse.json(
        { success: false, error: "Invite not found" },
        { status: 404 }
      );
    }

    // Verify invite belongs to this workspace
    if (existingInvite.workspace_id !== workspaceId) {
      return NextResponse.json(
        { success: false, error: "Invite does not belong to this workspace" },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { success: false, error: "Invalid email format" },
          { status: 400 }
        );
      }
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

    // Verify role exists if roleId is being updated
    if (roleId) {
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
    }

    // Update invite
    const updateData: any = {};
    if (email) updateData.email = email.toLowerCase().trim();
    if (roleId) updateData.role_id = roleId;
    if (status) updateData.status = status;

    const invite = await updateWorkspaceInvite(inviteId, updateData);

    return NextResponse.json({
      success: true,
      message: "Invite updated successfully",
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
    console.error("Error updating workspace invite:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update workspace invite",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const { id, inviteId } = await params;
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

    // Get existing invite to verify it belongs to this workspace
    const existingInvite = await getWorkspaceInviteById(inviteId);
    if (!existingInvite) {
      return NextResponse.json(
        { success: false, error: "Invite not found" },
        { status: 404 }
      );
    }

    // Verify invite belongs to this workspace
    if (existingInvite.workspace_id !== workspaceId) {
      return NextResponse.json(
        { success: false, error: "Invite does not belong to this workspace" },
        { status: 400 }
      );
    }

    // Delete invite
    await deleteWorkspaceInvite(inviteId);

    return NextResponse.json({
      success: true,
      message: "Invite deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting workspace invite:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete workspace invite",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
