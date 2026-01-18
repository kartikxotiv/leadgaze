import { NextRequest, NextResponse } from "next/server";
import {
  getOrganizationUsers,
  getUserOrganization,
} from "@/lib/data/user-organizations";
import { getUserById } from "@/lib/data/users";
import { getRoleById } from "@/lib/data/organization-roles";
import jwt from "jsonwebtoken";
import { AuthService } from "@/lib/auth-service";

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

    const userId = decoded.userId;
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

    // Get organization users - Direct query to bypass any potential issues
    const { supabase: supabaseClient } = await import("@/lib/supabase-client");

    // Direct query to check raw data
    const { data: rawData, error: rawError } = await supabaseClient
      .from("user_organizations")
      .select("*")
      .eq("organization_id", organizationId);

    console.log(`🔍 [Members API] Organization ID: ${organizationId}`);
    console.log(
      `🔍 [Members API] Direct query result: ${rawData?.length || 0} records`
    );
    if (rawData && rawData.length > 0) {
      console.log(
        `🔍 [Members API] Raw user_organizations data:`,
        rawData.map((r) => ({
          id: r.id,
          user_id: r.user_id,
          organization_id: r.organization_id,
          role_id: r.role_id,
          status: r.status,
        }))
      );
    }
    if (rawError) {
      console.error(`❌ [Members API] Direct query error:`, rawError);
    }

    // Get organization users using function
    const userOrganizations = await getOrganizationUsers(organizationId);

    // Debug logging
    console.log(
      `🔍 [Members API] Function result: ${userOrganizations.length} records in user_organizations table`
    );

    // Compare results
    if (rawData && rawData.length !== userOrganizations.length) {
      console.warn(
        `⚠️ [Members API] Mismatch! Direct query: ${rawData.length}, Function: ${userOrganizations.length}`
      );
    }

    // Get user and role details for each
    const formattedMembers = await Promise.all(
      userOrganizations.map(async (userOrg) => {
        try {
          const user = await getUserById(userOrg.user_id);

          // Skip if user doesn't exist
          if (!user) {
            console.warn(
              `⚠️ User not found for user_id: ${userOrg.user_id} in organization ${organizationId}`
            );
            return null;
          }

          const role = userOrg.role_id
            ? await getRoleById(userOrg.role_id)
            : null;

          // Get status from user_organizations table, default to 'active' if null
          const memberStatus = (userOrg as any).status || "active";

          return {
            userId: user.user_id,
            firstName: user.first_name,
            lastName: user.last_name,
            fullName: `${user.first_name} ${user.last_name}`,
            email: user.email,
            phoneNumber: user.phone_number,
            lastLogin: user.last_login,
            memberSince: user.created_at,
            joinedAt: userOrg.joined_at,
            status: memberStatus,
            role: {
              role: role?.role || "viewer",
              displayName: role?.display_name || "Viewer",
              permissions: role?.permissions || [],
            },
          };
        } catch (error) {
          console.error(
            `❌ Error processing user ${userOrg.user_id}:`,
            error instanceof Error ? error.message : error
          );
          return null;
        }
      })
    );

    // Filter out null values (missing or invalid users)
    const validMembers = formattedMembers.filter(
      (member): member is NonNullable<typeof member> => member !== null
    );

    // Debug logging
    console.log(
      `🔍 [Members API] Valid members after filtering: ${validMembers.length}`
    );
    console.log(
      `🔍 [Members API] Null/invalid members: ${
        formattedMembers.length - validMembers.length
      }`
    );

    // Sort by first name
    validMembers.sort((a, b) =>
      (a.firstName || "").localeCompare(b.firstName || "")
    );

    return NextResponse.json({
      success: true,
      members: validMembers,
      totalMembers: validMembers.length,
    });
  } catch (error) {
    console.error("Organization members error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch organization members",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
