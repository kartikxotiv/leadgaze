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

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // For signup purpose, check if email already exists
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

    // TODO: Re-enable rate limiting for production
    // Check for recent OTP requests (rate limiting) - DISABLED FOR DEVELOPMENT
    // const recentOTP = await EmailOTP.findLatestOTP(email, purpose);
    // if (recentOTP && !recentOTP.isExpired()) {
    //   const timeUntilExpiry = Math.ceil(
    //     (recentOTP.expiresAt.getTime() - new Date().getTime()) / 1000 / 60
    //   );
    //   return NextResponse.json(
    //     {
    //       success: false,
    //       error: `Please wait ${timeUntilExpiry} more minutes before requesting a new OTP`,
    //       canRetryIn: timeUntilExpiry * 60, // seconds
    //     },
    //     { status: 429 }
    //   );
    // }

    // Invalidate any existing OTPs for this email/purpose
    await EmailOTP.invalidateOTPs(email, purpose);

    // Create new OTP (expires in 10 minutes)
    const otpRecord = await EmailOTP.createOTP(email, purpose, 10);

    // Send OTP via email
    const emailSent = await emailService.sendOTPEmail({
      email,
      otp: (otpRecord as any).otp,
      purpose,
      expiresInMinutes: 10,
    });

    if (!emailSent) {
      // If email failed, clean up the OTP record
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
      expiresIn: 600, // 10 minutes in seconds
      canRetryIn: 600, // Can retry after current OTP expires
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send verification code" },
      { status: 500 }
    );
  }
}
