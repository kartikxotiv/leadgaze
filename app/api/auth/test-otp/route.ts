import { NextRequest, NextResponse } from "next/server";
import { createEmailOTP } from "@/lib/data/email-otp";

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

    const otpRecord = await createEmailOTP(email, purpose, 10);
    
    console.log("OTP created:", {
      email: otpRecord.email,
      otp: otpRecord.otp,
      purpose: otpRecord.purpose,
      expiresAt: otpRecord.expires_at
    });

    return NextResponse.json({
      success: true,
      message: "OTP generated successfully (test mode)",
      email,
      otp: otpRecord.otp,
      expiresAt: otpRecord.expires_at
    });

  } catch (error) {
    console.error("Test OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate OTP", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}