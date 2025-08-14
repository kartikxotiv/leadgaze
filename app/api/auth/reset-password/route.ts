import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, confirmPassword } = body;

    // Validate required fields
    if (!token || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Token and password are required",
        },
        { status: 400 }
      );
    }

    // Validate password confirmation if provided
    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Passwords do not match",
        },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: "Password must be at least 8 characters long",
        },
        { status: 400 }
      );
    }

    // Additional password strength validation
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must contain at least one uppercase letter, one lowercase letter, and one number",
        },
        { status: 400 }
      );
    }

    // Get client IP for logging
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Reset password
    const result = await AuthService.resetPassword(token, password);

    // Log successful password reset for security monitoring
    console.log(
      `Password reset completed for token: ${token.substring(
        0,
        8
      )}... from IP: ${clientIP}`
    );

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Reset password error:", error);

    // Return specific error message for better UX
    const errorMessage =
      error instanceof Error ? error.message : "Failed to reset password";

    // Determine appropriate status code based on error
    let statusCode = 500;
    if (
      errorMessage.includes("Invalid") ||
      errorMessage.includes("expired") ||
      errorMessage.includes("used")
    ) {
      statusCode = 400;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: statusCode }
    );
  }
}

// Token validation endpoint (GET)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Token is required",
        },
        { status: 400 }
      );
    }

    // Validate token
    const validation = await AuthService.validatePasswordResetToken(token);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Valid reset token",
      user: {
        firstName: validation.user?.firstName,
        lastName: validation.user?.lastName,
        email: validation.user?.email,
      },
    });
  } catch (error) {
    console.error("Token validation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error validating reset token",
      },
      { status: 500 }
    );
  }
}

// Prevent other HTTP methods
export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
