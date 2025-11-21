import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  getWorkspaceMemberById,
  updateWorkspaceMember,
  deleteWorkspaceMember,
} from "@/lib/data/workspace-members";
import { getWorkspaceById } from "@/lib/data/workspaces";
import { AuthService } from "@/lib/auth-service";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
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

    // Get member
    const member = await getWorkspaceMemberById(memberId);
    if (!member) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    // Format response
    const formattedMember = {
      id: member.id,
      userId: member.user_id,
      roleId: member.role_id,
      invitedBy: member.invited_by,
      status: member.status,
      createdAt: member.created_at,
      updatedAt: member.updated_at,
      user: member.user
        ? {
            userId: member.user.user_id,
            firstName: member.user.first_name,
            lastName: member.user.last_name,
            email: member.user.email,
            phoneNumber: member.user.phone_number,
            fullName: `${member.user.first_name} ${member.user.last_name}`,
          }
        : null,
      role: member.role
        ? {
            id: member.role.id,
            name: member.role.name,
            description: member.role.description,
          }
        : null,
      invitedByUser: member.invited_by_user
        ? {
            userId: member.invited_by_user.user_id,
            firstName: member.invited_by_user.first_name,
            lastName: member.invited_by_user.last_name,
            email: member.invited_by_user.email,
            fullName: `${member.invited_by_user.first_name} ${member.invited_by_user.last_name}`,
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      member: formattedMember,
    });
  } catch (error: any) {
    console.error("Error fetching workspace member:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch workspace member",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
    const workspaceId = id;

    const body = await request.json();
    const { roleId, status } = body;

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

    // Get existing member
    const existingMember = await getWorkspaceMemberById(memberId);
    if (!existingMember) {
      return NextResponse.json(
        { success: false, error: "Member not found" },
        { status: 404 }
      );
    }

    // Update member
    const updateData: any = {};
    if (roleId) updateData.role_id = roleId;
    if (status) updateData.status = status;

    const member = await updateWorkspaceMember(memberId, updateData);

    return NextResponse.json({
      success: true,
      message: "Member updated successfully",
      member: {
        id: member.id,
        userId: member.user_id,
        roleId: member.role_id,
        invitedBy: member.invited_by,
        status: member.status,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error updating workspace member:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update workspace member",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params;
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

    // Delete member (soft delete)
    await deleteWorkspaceMember(memberId);

    return NextResponse.json({
      success: true,
      message: "Member removed successfully",
    });
  } catch (error: any) {
    console.error("Error deleting workspace member:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to remove workspace member",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
