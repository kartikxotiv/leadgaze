import { NextRequest, NextResponse } from "next/server";
import { getOrganizationUsers, getUserOrganization } from "@/lib/data/user-organizations";
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

    // Get organization users
    const userOrganizations = await getOrganizationUsers(organizationId);

    // Get user and role details for each
    const formattedMembers = await Promise.all(
      userOrganizations.map(async (userOrg) => {
        const user = await getUserById(userOrg.user_id);
        const role = userOrg.role_id ? await getRoleById(userOrg.role_id) : null;

        return {
          userId: user?.user_id,
          firstName: user?.first_name,
          lastName: user?.last_name,
          fullName: user ? `${user.first_name} ${user.last_name}` : "Unknown User",
          email: user?.email,
          phoneNumber: user?.phone_number,
          lastLogin: user?.last_login,
          memberSince: user?.created_at,
          joinedAt: userOrg.joined_at,
          status: "active",
          role: {
            role: role?.role || "viewer",
            displayName: role?.display_name || "Viewer",
            permissions: role?.permissions || [],
          },
        };
      })
    );

    // Sort by first name
    formattedMembers.sort((a, b) => (a.firstName || "").localeCompare(b.firstName || ""));

    return NextResponse.json({
      success: true,
      members: formattedMembers,
      totalMembers: formattedMembers.length,
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
