import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";
import { EmailOTP } from "@/models";
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

   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   

   
    await EmailOTP.invalidateOTPs(email, purpose);

   
    const otpRecord = await EmailOTP.createOTP(email, purpose, 10);

   
    const emailSent = await emailService.sendOTPEmail({
      email,
      otp: (otpRecord as any).otp,
      purpose,
      expiresInMinutes: 10,
    });

    if (!emailSent) {
     
      await otpRecord.destroy();
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
