import { NextRequest, NextResponse } from "next/server";
import { EmailOTP } from "@/models";

export async function POST(request: NextRequest) {
  try {
    const { email, purpose = "signup" } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    console.log("Testing OTP generation for:", email);

   
    const otpRecord = await EmailOTP.createOTP(email, purpose, 10);
    
    console.log("OTP created:", {
      email: (otpRecord as any).email,
      otp: (otpRecord as any).otp,
      purpose: (otpRecord as any).purpose,
      expiresAt: (otpRecord as any).expiresAt
    });

    return NextResponse.json({
      success: true,
      message: "OTP generated successfully (test mode)",
      email,
      otp: (otpRecord as any).otp,
      expiresAt: (otpRecord as any).expiresAt
    });

  } catch (error) {
    console.error("Test OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate OTP", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}