import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

   
    if (
      !body.email ||
      !body.password ||
      !body.firstName ||
      !body.lastName ||
      !body.organizationName
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: email, password, firstName, lastName, organizationName",
        },
        { status: 400 }
      );
    }

   
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email format",
        },
        { status: 400 }
      );
    }

   
    if (body.password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters long",
        },
        { status: 400 }
      );
    }

   
    const result = await AuthService.registerUserWithOrganization({
      email: body.email,
      password: body.password,
      first_name: body.firstName,
      last_name: body.lastName,
      phone_number: body.phoneNumber,
      organization_name: body.organizationName,
      setup_questions: body.setupQuestions || {},
    });

   
    const loginResult = await AuthService.loginUser(body.email, body.password);

    return NextResponse.json({
      success: true,
      message: "User and organization created successfully",
      user: {
        userId: result.user.user_id,
        email: result.user.email,
        firstName: result.user.first_name,
        lastName: result.user.last_name,
      },
      organization: {
        organizationId: result.organization.organization_id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      token: loginResult.token,
      organizations: loginResult.organizations,
      currentOrganization: loginResult.currentOrganization,
    });
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        {
          success: false,
          error: "User with this email already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Registration failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
