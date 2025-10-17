import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

   
    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "Email is required",
        },
        { status: 400 }
      );
    }

   
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

   
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

   
   
   
   
   

   
   
   
   

   
   
   
   
   
   
   
   
   

   
    const result = await AuthService.initiatePasswordReset(email.toLowerCase());

   
    console.log(`Password reset requested for: ${email} from IP: ${clientIP}`);

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

   
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

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
