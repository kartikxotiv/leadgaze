import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  getWorkspaceMembersByWorkspaceId,
  createWorkspaceMember,
} from "@/lib/data/workspace-members";
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

    // Get workspace members
    const members = await getWorkspaceMembersByWorkspaceId(workspaceId);

    // Format response
    const formattedMembers = members.map((member) => ({
      id: member.id,
      userId: member.user_id,
      email: member.email,
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
        : member.email
        ? {
            userId: null,
            firstName: null,
            lastName: null,
            email: member.email,
            phoneNumber: null,
            fullName: member.email,
          }
        : null,
      role: member.role
        ? {
            id: member.role.id,
            name: member.role.name,
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
    }));

    return NextResponse.json({
      success: true,
      members: formattedMembers,
      totalMembers: formattedMembers.length,
    });
  } catch (error: any) {
    console.error("Error fetching workspace members:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch workspace members",
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
    const { email, roleId } = body;

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

    // Verify the role exists (roles are now global, not workspace-specific)
    // Since roles are global, we just need to check if the role exists and is not deleted
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

    // Check if member already exists (by email or by user_id if user exists)
    const existingMembers = await getWorkspaceMembersByWorkspaceId(workspaceId);
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists with this email
    const { data: existingUser } = await supabase
      .from("users")
      .select("user_id")
      .eq("email", normalizedEmail)
      .single();

    const existingMember = existingMembers.find(
      (m) =>
        (m.email === normalizedEmail ||
          (existingUser && m.user_id === existingUser.user_id)) &&
        m.role_id === roleId &&
        !m.is_deleted
    );

    if (existingMember) {
      return NextResponse.json(
        { success: false, error: "Member already exists in this workspace" },
        { status: 400 }
      );
    }

    // Get role name for email
    const { data: roleData, error: roleDataError } = await supabase
      .from("workspace_roles")
      .select("name")
      .eq("id", roleId)
      .single();

    if (roleDataError || !roleData) {
      return NextResponse.json(
        { success: false, error: "Failed to get role information" },
        { status: 400 }
      );
    }

    // Create workspace member with email (user_id will be null until they register)
    let member;
    try {
      member = await createWorkspaceMember({
        user_id: existingUser?.user_id || null,
        workspace_id: workspaceId,
        email: normalizedEmail,
        role_id: roleId,
        invited_by: currentUserId,
        status: "pending",
        is_deleted: false,
      });
    } catch (createError: any) {
      // If error is about missing workspace_id or email column, provide helpful message
      const errorMessage = createError?.message || "";
      const errorCode = createError?.code || "";

      if (
        errorMessage.includes("workspace_id") ||
        errorMessage.includes("column") ||
        errorCode === "42703"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Database migration required",
            details:
              "Please apply the migration file: supabase/migrations/20251120074651_add_email_to_workspace_members.sql",
            instructions:
              "Run this SQL in your Supabase SQL editor or use: supabase db push",
            migrationFile: "20251120074651_add_email_to_workspace_members.sql",
          },
          { status: 500 }
        );
      }
      throw createError;
    }

    // Send invitation email
    try {
      const baseUrl =
        process.env.NEXTAUTH_URL ||
        process.env.APP_URL ||
        "http://localhost:3000";

      // Get workspace and organization details
      const workspace = await getWorkspaceById(workspaceId);
      if (!workspace) {
        throw new Error("Workspace not found");
      }

      const { data: orgData } = await supabase
        .from("organizations")
        .select("name")
        .eq("organization_id", workspace.organization_id)
        .single();

      // Get inviter details
      const { data: inviterData } = await supabase
        .from("users")
        .select("first_name, last_name, email")
        .eq("user_id", currentUserId)
        .single();

      const inviterName =
        inviterData?.first_name && inviterData?.last_name
          ? `${inviterData.first_name} ${inviterData.last_name}`
          : inviterData?.email || "Team Member";

      const { emailService } = await import("@/lib/email-service");

      // For workspace invites, we'll create a simple invite URL
      // The user will register and the system will check for pending invites
      const inviteUrl = `${baseUrl}/auth/sign-up?email=${encodeURIComponent(
        normalizedEmail
      )}`;

      const emailSent = await emailService.sendInvitationEmail(
        normalizedEmail,
        {
          organizationName: orgData?.name || workspace.name || "Workspace",
          roleDisplay: roleData.name,
          inviterName,
          inviteUrl,
          message: `You've been invited to join the workspace "${workspace.name}"`,
          expiryDays: 7,
        }
      );

      if (emailSent) {
        console.log(`✅ Workspace invitation email sent to ${normalizedEmail}`);
      } else {
        console.warn(
          `⚠️ Workspace invitation email failed for ${normalizedEmail} (invitation still created)`
        );
      }
    } catch (emailError) {
      console.warn("Failed to send workspace invitation email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      member: {
        id: member.id,
        email: member.email,
        userId: member.user_id,
        roleId: member.role_id,
        invitedBy: member.invited_by,
        status: member.status,
        createdAt: member.created_at,
        updatedAt: member.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error creating workspace member:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add workspace member",
        details: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
