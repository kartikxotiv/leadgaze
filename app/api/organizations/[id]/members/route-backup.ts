import { NextRequest, NextResponse } from "next/server";
import { User, UserOrganization, OrganizationRole } from "@/models";
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

   
    const userId = decoded.user_id;
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

   
    const userOrganizations = await UserOrganization.findAll({
      where: { organizationId },
      include: [
        {
          model: User,
          attributes: [
            "userId",
            "firstName",
            "lastName",
            "email",
            "phoneNumber",
            "lastLogin",
            "createdAt",
          ],
        },
        {
          model: OrganizationRole,
          attributes: ["role", "displayName", "permissions"],
        },
      ],
      attributes: ["joinedAt", "status"],
      order: [["User", "firstName", "ASC"]],
    });

   
    const formattedMembers = userOrganizations.map((userOrg: any) => {
      const user = userOrg.User;
      const role = userOrg.OrganizationRole;

      return {
        userId: user.userId,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phoneNumber: user.phoneNumber,
        lastLogin: user.lastLogin,
        memberSince: user.createdAt,
        joinedAt: userOrg.joinedAt,
        status: userOrg.status || "active",
        role: {
          role: role?.role || "user",
          displayName: role?.displayName || "User",
          permissions: role?.permissions || [],
        },
      };
    });

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
