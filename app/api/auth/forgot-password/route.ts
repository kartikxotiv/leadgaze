import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
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
          error: "Please enter a valid email address",
        },
        { status: 400 }
      );
    }

    // Get client IP for rate limiting
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check rate limiting - DISABLED FOR NOW
    // const rateLimit = await AuthService.checkPasswordResetRateLimit(
    //   email.toLowerCase(),
    //   clientIP
    // );

    // if (!rateLimit.allowed) {
    //   const resetTimeString = rateLimit.resetTime
    //     ? new Date(rateLimit.resetTime).toLocaleTimeString()
    //     : "later";

    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: `Too many password reset attempts. Please try again after ${resetTimeString}.`,
    //       retryAfter: rateLimit.resetTime,
    //     },
    //     { status: 429 }
    //   );
    // }

    // Initiate password reset
    const result = await AuthService.initiatePasswordReset(email.toLowerCase());

    // Log the attempt for security monitoring
    console.log(`Password reset requested for: ${email} from IP: ${clientIP}`);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    // Don't expose internal errors to client for security
    return NextResponse.json(
      {
        success: false,
        error:
          "An error occurred while processing your request. Please try again.",
      },
      { status: 500 }
    );
  }
}

// Prevent other HTTP methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
