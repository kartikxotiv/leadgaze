import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invitationToken, password, fullName } = body;

    console.log("🔍 Accept invitation request:", {
      invitationToken: invitationToken?.substring(0, 20) + "...",
      hasPassword: !!password,
      fullName,
    });

    // Validate required fields
    if (!invitationToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required field: invitationToken",
        },
        { status: 400 }
      );
    }

    // Get invitation details first
    const invitation = await AuthService.getInvitationByToken(invitationToken);

    console.log("🔍 Invitation lookup result:", {
      found: !!invitation,
      isExpired: invitation?.isExpired,
      isAccepted: invitation?.isAccepted,
    });

    if (!invitation) {
      console.log("❌ No invitation found for token");
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired invitation",
        },
        { status: 404 }
      );
    }

    if (invitation.isExpired) {
      return NextResponse.json(
        {
          success: false,
          error: "Invitation has expired",
        },
        { status: 410 }
      );
    }

    if (invitation.isAccepted) {
      return NextResponse.json(
        {
          success: false,
          error: "Invitation has already been accepted",
        },
        { status: 409 }
      );
    }

    // Accept invitation
    const result = await AuthService.acceptInvitation(
      invitationToken,
      password,
      fullName
    );

    // Auto-login the user after accepting invitation with org-scoped credentials
    const loginResult = await AuthService.loginUser(
      (result.user as any).email,
      password,
      false, // Don't skip password check
      (result.organization as any).organizationId // Use org-scoped login
    );

    return NextResponse.json({
      success: true,
      message: result.isNewUser
        ? "Account created and invitation accepted successfully"
        : "Invitation accepted successfully",
      user: {
        userId: (result.user as any).userId,
        email: (result.user as any).email,
        firstName: (result.user as any).firstName,
        lastName: (result.user as any).lastName,
        isNewUser: result.isNewUser,
      },
      organization: {
        organizationId: (result.organization as any).organizationId,
        name: (result.organization as any).name,
        slug: (result.organization as any).slug,
      },
      role: {
        role: (result.role as any).role,
        displayName: (result.role as any).displayName,
        permissions: (result.role as any).permissions,
      },
      token: loginResult.token,
      organizations: loginResult.organizations,
      currentOrganization: loginResult.currentOrganization,
    });
  } catch (error) {
    console.error("Accept invitation error:", error);

    if (error instanceof Error) {
      if (error.message.includes("Invalid or expired")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid or expired invitation token",
          },
          { status: 404 }
        );
      }

      if (error.message.includes("expired")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invitation has expired",
          },
          { status: 410 }
        );
      }

      if (error.message.includes("already been accepted")) {
        return NextResponse.json(
          {
            success: false,
            error: "Invitation has already been accepted",
          },
          { status: 409 }
        );
      }

      if (error.message.includes("Password required")) {
        return NextResponse.json(
          {
            success: false,
            error: "Password required for new user registration",
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to accept invitation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invitationToken = searchParams.get("token");

    if (!invitationToken) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameter: token",
        },
        { status: 400 }
      );
    }

    // Get invitation details
    const invitation = await AuthService.getInvitationByToken(invitationToken);

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid invitation token",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        organization: {
          name: invitation.organization.name,
          description: invitation.organization.description,
        },
        role: {
          displayName: invitation.role.displayName,
          description: invitation.role.description,
        },
        inviter: {
          name: `${invitation.inviter.firstName} ${invitation.inviter.lastName}`,
          email: invitation.inviter.email,
        },
        message: invitation.message,
        expiresAt: invitation.expiresAt,
        isExpired: invitation.isExpired,
        isAccepted: invitation.isAccepted,
      },
    });
  } catch (error) {
    console.error("Get invitation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to get invitation details",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
