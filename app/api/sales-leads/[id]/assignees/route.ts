import { NextRequest, NextResponse } from "next/server";
import {
  getLeadAssignees,
  addLeadAssignee,
  removeLeadAssignee,
  updateLeadAssignees,
} from "@/lib/data/lead-assignees";
import { verifyAuth } from "@/lib/rbac/api-helpers";
import { getSalesLeadById } from "@/lib/data/sales-leads";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const assignees = await getLeadAssignees(id);
    return NextResponse.json({ success: true, data: assignees });
  } catch (error: any) {
    console.error("Error fetching lead assignees:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch lead assignees",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user from token
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { userId: currentUserId } = authResult;

    const { id } = params;
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    // Get the lead's workspace_id first
    const lead = await getSalesLeadById(id);

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    const workspaceId = lead.workspace_id;
    console.log(`🏢 Lead workspace_id: ${workspaceId}`);

    // Automatically add user to workspace if they're not already a member
    if (workspaceId) {
      const { createWorkspaceMember, getWorkspaceMembersByWorkspaceId } =
        await import("@/lib/data/workspace-members");
      const { supabase } = await import("@/lib/supabase-client");

      // Check if user is already a member (including pending status)
      const { data: existingMember } = await supabase
        .from("workspace_members")
        .select("id, status, role_id")
        .eq("user_id", body.userId)
        .eq("workspace_id", workspaceId)
        .eq("is_deleted", false)
        .maybeSingle();

      // Try to find a role with "Sales Leads" view permission
      let roleToAssign = null;

      // Get all workspace roles
      const { data: allRoles } = await supabase
        .from("workspace_roles")
        .select("id, permissions")
        .eq("is_deleted", false);

      if (allRoles && allRoles.length > 0) {
        // Find a role that has "Sales Leads" view permission
        for (const role of allRoles) {
          const permissions = role.permissions || {};
          // Check if permissions have "Sales Leads" route with view permission
          const salesLeadsPerm =
            permissions["Sales Leads"] || permissions["Sales Leads Route"];
          if (salesLeadsPerm && salesLeadsPerm.view === true) {
            roleToAssign = role;
            console.log(
              `✅ Found role with Sales Leads permission: ${role.id}`
            );
            break;
          }
        }

        // If no role with Sales Leads permission found, use first available role
        if (!roleToAssign) {
          roleToAssign = allRoles[0];
          console.log(
            `⚠️ No role with Sales Leads permission found, using default role: ${roleToAssign.id}`
          );
        }
      }

      if (roleToAssign) {
        try {
          // Verify role exists and is not deleted
          const { data: roleCheck } = await supabase
            .from("workspace_roles")
            .select("id, name, is_deleted")
            .eq("id", roleToAssign.id)
            .eq("is_deleted", false)
            .single();

          if (!roleCheck) {
            console.error(
              `❌ Role ${roleToAssign.id} not found or deleted, skipping assignment`
            );
          } else {
            // Get user email
            const { data: user } = await supabase
              .from("users")
              .select("email")
              .eq("user_id", body.userId)
              .single();

            if (user) {
              if (existingMember) {
                // If user already has a role, preserve it - only update status if needed
                if (existingMember.status !== "accepted") {
                  // Only update status, don't change role - preserve existing role
                  const { updateWorkspaceMember } = await import(
                    "@/lib/data/workspace-members"
                  );
                  await updateWorkspaceMember(existingMember.id, {
                    status: "accepted",
                    // Don't update role_id - preserve existing role
                  });
                  console.log(
                    `✅ Updated existing member ${body.userId} in workspace ${workspaceId} - status: accepted, role preserved: ${existingMember.role_id}`
                  );
                } else {
                  console.log(
                    `ℹ️ User ${body.userId} already a member with accepted status and role ${existingMember.role_id} - no update needed`
                  );
                }
              } else {
                // Create new member
                await createWorkspaceMember({
                  user_id: body.userId,
                  workspace_id: workspaceId,
                  email: user.email,
                  role_id: roleToAssign.id,
                  invited_by: currentUserId,
                  status: "accepted",
                  is_deleted: false,
                });
                console.log(
                  `✅ Auto-added user ${body.userId} to workspace ${workspaceId} with role ${roleCheck.name} (${roleToAssign.id})`
                );
              }
            }
          }
        } catch (error: any) {
          // If member already exists or other error, just log it
          if (
            error?.message?.includes("duplicate") ||
            error?.code === "23505" ||
            error?.message?.includes("already exists")
          ) {
            console.log(
              `ℹ️ User ${body.userId} already a member of workspace ${workspaceId}`
            );
          } else {
            console.error(
              `❌ Failed to auto-add/update user ${body.userId} to workspace:`,
              error
            );
          }
        }
      }
    }

    console.log(
      `🔗 Assigning lead ${id} to user ${body.userId} by ${currentUserId}`
    );
    const assignee = await addLeadAssignee(id, body.userId, currentUserId);
    console.log(
      `✅ Successfully assigned lead ${id} to user ${body.userId}:`,
      assignee
    );
    return NextResponse.json({ success: true, data: assignee });
  } catch (error: any) {
    console.error("Error adding lead assignee:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to add assignee" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get current user from token
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { userId: currentUserId } = authResult;

    const { id } = params;
    const body = await request.json();

    if (!Array.isArray(body.userIds)) {
      return NextResponse.json(
        { success: false, error: "userIds array is required" },
        { status: 400 }
      );
    }

    console.log(
      `🔄 Updating assignees for lead ${id} - userIds:`,
      body.userIds,
      `assigned by: ${currentUserId}`
    );

    // Get the lead's workspace_id first
    const lead = await getSalesLeadById(id);

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    const workspaceId = lead.workspace_id;
    console.log(`🏢 Lead workspace_id: ${workspaceId}`);

    // Automatically add users to workspace if they're not already members
    if (workspaceId && body.userIds.length > 0) {
      const { createWorkspaceMember, getWorkspaceMembersByWorkspaceId } =
        await import("@/lib/data/workspace-members");
      const { supabase } = await import("@/lib/supabase-client");

      // Try to find a role with "Sales Leads" view permission
      let roleToAssign = null;

      // Get all workspace roles
      const { data: allRoles } = await supabase
        .from("workspace_roles")
        .select("id, permissions")
        .eq("is_deleted", false);

      if (allRoles && allRoles.length > 0) {
        // Find a role that has "Sales Leads" view permission
        for (const role of allRoles) {
          const permissions = role.permissions || {};
          // Check if permissions have "Sales Leads" route with view permission
          const salesLeadsPerm =
            permissions["Sales Leads"] || permissions["Sales Leads Route"];
          if (salesLeadsPerm && salesLeadsPerm.view === true) {
            roleToAssign = role;
            console.log(
              `✅ Found role with Sales Leads permission: ${role.id}`
            );
            break;
          }
        }

        // If no role with Sales Leads permission found, use first available role
        if (!roleToAssign) {
          roleToAssign = allRoles[0];
          console.log(
            `⚠️ No role with Sales Leads permission found, using default role: ${roleToAssign.id}`
          );
        }
      }

      if (!roleToAssign) {
        console.warn("⚠️ No role found, skipping auto-add to workspace");
      } else {
        // Add/update users to workspace
        for (const userId of body.userIds) {
          try {
            // Check if user is already a member (including pending status)
            const { data: existingMember } = await supabase
              .from("workspace_members")
              .select("id, status, role_id")
              .eq("user_id", userId)
              .eq("workspace_id", workspaceId)
              .eq("is_deleted", false)
              .maybeSingle();

            // Verify role exists and is not deleted
            const { data: roleCheck } = await supabase
              .from("workspace_roles")
              .select("id, name, is_deleted")
              .eq("id", roleToAssign.id)
              .eq("is_deleted", false)
              .single();

            if (!roleCheck) {
              console.error(
                `❌ Role ${roleToAssign.id} not found or deleted for user ${userId}, skipping assignment`
              );
              continue;
            }

            // Get user email
            const { data: user } = await supabase
              .from("users")
              .select("email")
              .eq("user_id", userId)
              .single();

            if (user) {
              if (existingMember) {
                // If user already has a role, preserve it - only update status if needed
                if (existingMember.status !== "accepted") {
                  // Only update status, don't change role - preserve existing role
                  const { updateWorkspaceMember } = await import(
                    "@/lib/data/workspace-members"
                  );
                  await updateWorkspaceMember(existingMember.id, {
                    status: "accepted",
                    // Don't update role_id - preserve existing role
                  });
                  console.log(
                    `✅ Updated existing member ${userId} in workspace ${workspaceId} - status: accepted, role preserved: ${existingMember.role_id}`
                  );
                } else {
                  console.log(
                    `ℹ️ User ${userId} already a member with accepted status and role ${existingMember.role_id} - no update needed`
                  );
                }
              } else {
                // Create new member
                await createWorkspaceMember({
                  user_id: userId,
                  workspace_id: workspaceId,
                  email: user.email,
                  role_id: roleToAssign.id,
                  invited_by: currentUserId,
                  status: "accepted",
                  is_deleted: false,
                });
                console.log(
                  `✅ Auto-added user ${userId} to workspace ${workspaceId} with role ${roleCheck.name} (${roleToAssign.id})`
                );
              }
            }
          } catch (error: any) {
            // If member already exists or other error, just log it
            if (
              error?.message?.includes("duplicate") ||
              error?.code === "23505" ||
              error?.message?.includes("already exists")
            ) {
              console.log(
                `ℹ️ User ${userId} already a member of workspace ${workspaceId}`
              );
            } else {
              console.error(
                `❌ Failed to auto-add/update user ${userId} to workspace:`,
                error
              );
            }
          }
        }
      }
    }

    // updateLeadAssignees() function call karo
    // Ye function pehle delete karega, phir insert karega
    const assignees = await updateLeadAssignees(
      id,
      body.userIds,
      currentUserId
    );
    console.log(
      `✅ Successfully updated assignees for lead ${id}:`,
      assignees.map((a: any) => a.user_id)
    );
    return NextResponse.json({ success: true, data: assignees });
  } catch (error: any) {
    console.error("Error updating lead assignees:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to update assignees",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    await removeLeadAssignee(id, userId);
    return NextResponse.json({ success: true, data: { removed: true } });
  } catch (error: any) {
    console.error("Error removing lead assignee:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to remove assignee" },
      { status: 500 }
    );
  }
}
