import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import {
  getWorkspaceInvitesByWorkspaceId,
  createWorkspaceInvite,
  getWorkspaceInvitesPaginated,
  updateWorkspaceInvite,
} from "@/lib/data/workspace-invites";
import { getWorkspaceById } from "@/lib/data/workspaces";
import { AuthService } from "@/lib/auth-service";
import { supabase } from "@/lib/supabase-client";
import { getUserByEmail } from "@/lib/data/users";
import { createWorkspaceMember } from "@/lib/data/workspace-members";
import {
  getUserOrganization,
  createUserOrganization,
} from "@/lib/data/user-organizations";

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

    // Debug logging
    console.log("[GET /api/workspaces/[id]/invites] Request details:", {
      workspaceId,
      userId,
      page,
      limit,
      status,
      search,
      filters,
    });

    // Get workspace invites
    let invites: {
      data: any[];
      count: number;
      page: number;
      limit: number;
      totalPages: number;
    };
    if (page && limit) {
      const paginatedInvites = await getWorkspaceInvitesPaginated(
        workspaceId,
        page,
        limit,
        Object.keys(filters).length > 0 ? filters : undefined,
        search || undefined
      );
      invites = {
        data: paginatedInvites.data,
        count: paginatedInvites.count,
        page: paginatedInvites.page,
        limit: paginatedInvites.limit,
        totalPages: paginatedInvites.totalPages,
      };
      console.log("[GET /api/workspaces/[id]/invites] Paginated invites:", {
        count: invites.count,
        dataLength: invites.data.length,
        firstFew: invites.data.slice(0, 3).map((inv) => ({
          id: inv.id,
          email: inv.email,
          status: inv.status,
        })),
      });
    } else {
      const allInvites = await getWorkspaceInvitesByWorkspaceId(workspaceId);
      invites = {
        data: allInvites,
        count: allInvites.length,
        page: 1,
        limit: allInvites.length,
        totalPages: 1,
      };
      console.log("[GET /api/workspaces/[id]/invites] All invites:", {
        count: invites.count,
        dataLength: invites.data.length,
        firstFew: invites.data.slice(0, 3).map((inv) => ({
          id: inv.id,
          email: inv.email,
          status: inv.status,
        })),
      });
    }

    // Also check directly in database for debugging
    const { data: directCheck, error: directError } = await supabase
      .from("workspace_invites")
      .select("id, email, status, workspace_id, created_at")
      .eq("workspace_id", workspaceId);

    console.log("[GET /api/workspaces/[id]/invites] Direct database check:", {
      directCheckCount: directCheck?.length || 0,
      directCheckError: directError?.message,
      directCheckData: directCheck?.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
      })),
    });

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
        total: invites.count || invites.data?.length || 0,
        page: invites.page || 1,
        limit: invites.limit || invites.data?.length || 20,
        totalPages: invites.totalPages || 1,
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists with this email
    const existingUser = await getUserByEmail(normalizedEmail);

    // Check if invite already exists for this email and workspace
    const { data: existingInvite } = await supabase
      .from("workspace_invites")
      .select("id, status")
      .eq("email", normalizedEmail)
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

    // If user exists, auto-create workspace member and mark invite as accepted
    if (existingUser) {
      try {
        console.log(
          "[POST /api/workspaces/[id]/invites] User exists, auto-adding to workspace:",
          {
            userId: existingUser.user_id,
            email: normalizedEmail,
            workspaceId,
            roleId,
          }
        );

        // Check if user is already a member of this workspace
        const { data: existingMember, error: memberCheckError } = await supabase
          .from("workspace_members")
          .select("id, status")
          .eq("user_id", existingUser.user_id)
          .eq("workspace_id", workspaceId)
          .eq("is_deleted", false)
          .single();

        if (memberCheckError && memberCheckError.code !== "PGRST116") {
          console.error(
            "[POST /api/workspaces/[id]/invites] Error checking existing member:",
            memberCheckError
          );
        }

        if (existingMember) {
          // User is already a member
          if (existingMember.status === "accepted") {
            console.log(
              "[POST /api/workspaces/[id]/invites] User already a member with accepted status"
            );
            return NextResponse.json(
              {
                success: false,
                error: "User is already a member of this workspace",
              },
              { status: 400 }
            );
          } else {
            // Update existing member to accepted
            console.log(
              "[POST /api/workspaces/[id]/invites] Updating existing member to accepted"
            );
            const { error: updateError } = await supabase
              .from("workspace_members")
              .update({
                status: "accepted",
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingMember.id);

            if (updateError) {
              console.error(
                "[POST /api/workspaces/[id]/invites] Error updating member:",
                updateError
              );
              throw updateError;
            }
          }
        } else {
          // Ensure user is in the organization
          const userOrg = await getUserOrganization(
            existingUser.user_id,
            workspace.organization_id
          );

          if (!userOrg) {
            console.log(
              "[POST /api/workspaces/[id]/invites] Adding user to organization"
            );
            // Add user to organization with default role
            const defaultRoleId = await AuthService.getRoleId("user");
            await createUserOrganization({
              user_id: existingUser.user_id,
              organization_id: workspace.organization_id,
              role_id: defaultRoleId,
              joined_at: new Date().toISOString(),
            });
          }

          // Create workspace member
          console.log(
            "[POST /api/workspaces/[id]/invites] Creating workspace member"
          );
          await createWorkspaceMember({
            user_id: existingUser.user_id,
            workspace_id: workspaceId,
            email: normalizedEmail,
            role_id: roleId,
            invited_by: currentUserId,
            status: "accepted",
            is_deleted: false,
          });
        }

        // Create invite with accepted status (only if one doesn't already exist)
        let invite;
        if (!existingInvite) {
          console.log(
            "[POST /api/workspaces/[id]/invites] Creating invite with accepted status"
          );
          invite = await createWorkspaceInvite({
            email: normalizedEmail,
            workspace_id: workspaceId,
            role_id: roleId,
            invited_by: currentUserId,
            status: "accepted",
          });
        } else {
          console.log(
            "[POST /api/workspaces/[id]/invites] Updating existing invite to accepted"
          );
          const { getWorkspaceInviteById, updateWorkspaceInvite } =
            await import("@/lib/data/workspace-invites");
          const existingInviteFull = await getWorkspaceInviteById(
            existingInvite.id
          );
          if (existingInviteFull) {
            invite = await updateWorkspaceInvite(existingInvite.id, {
              status: "accepted",
            });
          } else {
            invite = await createWorkspaceInvite({
              email: normalizedEmail,
              workspace_id: workspaceId,
              role_id: roleId,
              invited_by: currentUserId,
              status: "accepted",
            });
          }
        }

        console.log(
          "[POST /api/workspaces/[id]/invites] Successfully auto-added user and created invite:",
          invite?.id
        );

        return NextResponse.json({
          success: true,
          message: "User added to workspace successfully",
          invite: invite
            ? {
                id: invite.id,
                email: invite.email,
                workspaceId: invite.workspace_id,
                roleId: invite.role_id,
                invitedBy: invite.invited_by,
                status: invite.status,
                createdAt: invite.created_at,
                updatedAt: invite.updated_at,
              }
            : null,
          autoAdded: true,
        });
      } catch (error: any) {
        console.error(
          "[POST /api/workspaces/[id]/invites] Error auto-adding user to workspace:",
          error
        );
        // If auto-add fails, create pending invite anyway (for debugging)
        console.log(
          "[POST /api/workspaces/[id]/invites] Falling back to creating pending invite"
        );
      }
    }

    // Create workspace invite (user doesn't exist or auto-add failed)
    const invite = await createWorkspaceInvite({
      email: normalizedEmail,
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
