import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function POST(request: NextRequest) {
  try {
    // Get JWT token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, role, organizationId, message } = body;

    // Validate required fields
    if (!email || !role || !organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: email, role, organizationId",
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email format",
        },
        { status: 400 }
      );
    }

    console.log("🔍 JWT Token decoded:", JSON.stringify(decoded, null, 2));

    const jwtUserId = decoded.user_id || decoded.userId; // JWT user ID
    console.log("🔍 JWT userId:", jwtUserId);
    console.log("🔍 Target organizationId:", organizationId);

    // Get the actual user from database using email (fallback for JWT mismatch)
    let actualUserId = jwtUserId;
    try {
      const User = (await import("@/models")).User;
      const userByEmail = await User.findOne({
        where: { email: decoded.email },
        attributes: ["userId"],
      });

      if (userByEmail) {
        actualUserId = (userByEmail as any).userId;
        console.log("✅ Found actual userId by email:", actualUserId);
      } else {
        console.log("⚠️ No user found with email:", decoded.email);
      }
    } catch (error) {
      console.log("⚠️ Error finding user by email:", error);
    }

    // Verify user has permission to invite users to this organization
    const hasAccess = await AuthService.userHasAccessToOrganization(
      actualUserId,
      organizationId
    );

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: "Access denied to this organization" },
        { status: 403 }
      );
    }

    // Create invitation
    const invitation = await AuthService.createInvitation(
      organizationId,
      email,
      role,
      actualUserId,
      message
    );

    // Best-effort: send invitation email
    try {
      const baseUrl =
        process.env.NEXTAUTH_URL ||
        process.env.APP_URL ||
        "http://localhost:3000";
      const inviteUrl = `${baseUrl}/auth/accept-invitation?token=${
        (invitation as any).invitationToken
      }`;

      const { emailService } = await import("@/lib/email-service");
      const orgDetails = await AuthService.getOrganizationDetails(
        organizationId
      );

      // Get inviter name from JWT token
      const inviterName =
        decoded.firstName && decoded.lastName
          ? `${decoded.firstName} ${decoded.lastName}`
          : decoded.email || "Team Member";

      const emailSent = await emailService.sendInvitationEmail(email, {
        organizationName: orgDetails.name,
        roleDisplay: role,
        inviterName,
        inviteUrl,
        message,
        expiryDays: 7,
      });

      if (emailSent) {
        console.log(`✅ Invitation email sent to ${email}`);
      } else {
        console.warn(
          `⚠️ Invitation email failed for ${email} (invitation still created)`
        );
      }
    } catch (e) {
      console.warn("Invite email skipped:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      invitation: {
        id: (invitation as any).id,
        email: (invitation as any).email,
        role: role,
        expiresAt: (invitation as any).expiresAt,
        createdAt: (invitation as any).createdAt,
      },
    });
  } catch (error) {
    console.error("Invitation error:", error);

    if (error instanceof Error) {
      if (error.message.includes("already a member")) {
        return NextResponse.json(
          {
            success: false,
            error: "User is already a member of this organization",
          },
          { status: 409 }
        );
      }

      if (error.message.includes("already sent")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invitation already sent to this email",
          },
          { status: 409 }
        );
      }

      if (error.message.includes("not found")) {
        return NextResponse.json(
          {
            success: false,
            error: "Role not found",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to send invitation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get JWT token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "No authorization token provided" },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: organizationId",
        },
        { status: 400 }
      );
    }

    // Our JWT uses camelCase keys
    const userId = decoded.userId;

    // Verify user has access to this organization
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

    // Get organization invitations
    const invitations = await AuthService.getOrganizationInvitations(
      organizationId
    );

    return NextResponse.json({
      success: true,
      invitations,
    });
  } catch (error) {
    console.error("Get invitations error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get invitations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
