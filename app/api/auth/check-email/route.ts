import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

   
    const emailExists = await AuthService.checkEmailExists(email);

    return NextResponse.json({
      success: true,
      exists: emailExists,
      message: emailExists
        ? "An account with this email already exists"
        : "Email is available",
    });
  } catch (error) {
    console.error("Email check error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check email availability" },
      { status: 500 }
    );
  }
}
