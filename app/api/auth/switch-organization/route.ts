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

    const { organizationId } = await request.json();

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Our JWT payload uses camelCase keys
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

    // Update user session with new current organization
    await AuthService.updateUserCurrentOrganization(userId, organizationId);

    // Get updated user data with new current organization
    const userEmail = decoded.email;
    const loginResult = await AuthService.loginUser(userEmail, null, true); // Skip password check

    return NextResponse.json({
      success: true,
      message: "Organization switched successfully",
      user: {
        userId: loginResult.user.userId,
        email: loginResult.user.email,
        firstName: loginResult.user.firstName,
        lastName: loginResult.user.lastName,
      },
      token: loginResult.token,
      organizations: loginResult.organizations,
      currentOrganization: loginResult.currentOrganization,
    });
  } catch (error) {
    console.error("Organization switch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to switch organization",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
