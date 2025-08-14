import { NextRequest, NextResponse } from "next/server";
import { EmailOTP } from "@/models";

export async function POST(request: NextRequest) {
  try {
    const { email, otp, purpose = "signup" } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and OTP are required" },
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

    // Validate OTP format (6 digits)
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: "OTP must be 6 digits" },
        { status: 400 }
      );
    }

    // Find the OTP record
    const otpRecord = await EmailOTP.findValidOTP(email, otp, purpose);

    if (!otpRecord) {
      // Check if there's any recent OTP for this email to give better error message
      const recentOTP = await EmailOTP.findLatestOTP(email, purpose);

      if (!recentOTP) {
        return NextResponse.json(
          {
            success: false,
            error: "No verification code found. Please request a new one.",
          },
          { status: 404 }
        );
      }

      if (recentOTP.isExpired()) {
        return NextResponse.json(
          {
            success: false,
            error: "Verification code has expired. Please request a new one.",
            expired: true,
          },
          { status: 410 }
        );
      }

      if (recentOTP.isVerified()) {
        return NextResponse.json(
          {
            success: false,
            error: "This verification code has already been used.",
          },
          { status: 409 }
        );
      }

      if (!recentOTP.canAttempt()) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Too many incorrect attempts. Please request a new verification code.",
            tooManyAttempts: true,
          },
          { status: 429 }
        );
      }

      // Increment attempts for wrong OTP
      await recentOTP.incrementAttempts();

      const attemptsLeft = 5 - recentOTP.attempts;
      return NextResponse.json(
        {
          success: false,
          error: `Invalid verification code. ${attemptsLeft} attempts remaining.`,
          attemptsLeft,
        },
        { status: 400 }
      );
    }

    // Check if OTP can still be used
    if (!otpRecord.canAttempt()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Verification code is no longer valid. Please request a new one.",
        },
        { status: 410 }
      );
    }

    // Mark OTP as verified
    await otpRecord.markVerified();

    // Invalidate any other OTPs for this email/purpose
    await EmailOTP.invalidateOTPs(email, purpose);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully",
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
