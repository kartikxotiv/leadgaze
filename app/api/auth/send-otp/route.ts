import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";
import { createEmailOTP, deleteOTP } from "@/lib/data/email-otp";
import emailService from "@/lib/email-service";

export async function POST(request: NextRequest) {
  try {
    const { email, purpose = "signup" } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

   
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

   
    if (purpose === "signup") {
      const emailExists = await AuthService.checkEmailExists(email);
      if (emailExists) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email already exists",
          },
          { status: 409 }
        );
      }
    }

   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   

    // Create OTP (invalidation is handled in createEmailOTP)
    const otpRecord = await createEmailOTP(email, purpose, 10);

    // Send email
    const emailSent = await emailService.sendOTPEmail({
      email,
      otp: otpRecord.otp,
      purpose,
      expiresInMinutes: 10,
    });

    if (!emailSent) {
      // Delete OTP if email failed
      await deleteOTP(otpRecord.id);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to send verification email. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent to your email",
      expiresIn: 600,
      canRetryIn: 600,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
