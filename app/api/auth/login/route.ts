import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: email, password",
        },
        { status: 400 }
      );
    }

    // Optional org context
    const organizationSlug = body.organizationSlug || body.orgSlug;
    const organizationId = body.organizationId;

    // Login user (org-scoped if provided)
    const result = await AuthService.loginUser(
      body.email,
      body.password,
      false,
      organizationId,
      organizationSlug
    );

    return NextResponse.json({
      success: true,
      user: {
        userId: (result.user as any).userId,
        email: (result.user as any).email,
        firstName: (result.user as any).firstName,
        lastName: (result.user as any).lastName,
      },
      token: result.token,
      organizations: result.organizations,
      currentOrganization: result.currentOrganization,
    });
  } catch (error) {
    console.error("Login error:", error);

    if (
      error instanceof Error &&
      error.message.includes("Invalid email or password")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password",
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Login failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
