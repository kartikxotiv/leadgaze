import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail } from "@/lib/data/users";
import { getWorkspaceInvitesByEmail } from "@/lib/data/workspace-invites";
import {
  getWorkspaceMembersByUserId,
  getWorkspaceMembersByEmail,
} from "@/lib/data/workspace-members";
import { getWorkspacesByUserId } from "@/lib/data/workspaces";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get("email");
    const userId = searchParams.get("userId");

    if (!email && !userId) {
      return NextResponse.json(
        { success: false, error: "email or userId is required" },
        { status: 400 }
      );
    }

    const result: any = {
      success: true,
      email: email || null,
      userId: userId || null,
    };

    // Check if user exists by email
    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      result.email = normalizedEmail;

      const user = await getUserByEmail(normalizedEmail);
      result.userExists = !!user;
      result.user = user
        ? {
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
          }
        : null;

      if (user) {
        result.userId = user.user_id;
      }

      // Check workspace invites for this email
      const invites = await getWorkspaceInvitesByEmail(normalizedEmail);
      result.invites = invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        workspace_id: invite.workspace_id,
        role_id: invite.role_id,
        status: invite.status,
        workspace_name: invite.workspace?.name,
        role_name: invite.role?.name,
      }));

      // Check workspace members by email (pending members)
      const pendingMembers = await getWorkspaceMembersByEmail(normalizedEmail);
      result.pendingMembers = pendingMembers.map((member) => ({
        id: member.id,
        user_id: member.user_id,
        workspace_id: member.workspace_id,
        email: member.email,
        role_id: member.role_id,
        status: member.status,
      }));
    }

    // Check workspace members and workspaces by userId
    if (result.userId) {
      const userIdToCheck = result.userId;

      // Get workspace members for this user
      const members = await getWorkspaceMembersByUserId(userIdToCheck);
      result.workspaceMembers = members.map((member) => ({
        id: member.id,
        user_id: member.user_id,
        workspace_id: member.workspace_id,
        email: member.email,
        role_id: member.role_id,
        role_name: member.role?.name,
        status: member.status,
        is_deleted: member.is_deleted,
      }));

      // Get workspaces for this user
      const workspaces = await getWorkspacesByUserId(userIdToCheck);
      result.workspaces = workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
        organization_id: ws.organization_id,
        organization_name: ws.organization?.name,
      }));
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in workspace invite check:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check workspace invite status",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
