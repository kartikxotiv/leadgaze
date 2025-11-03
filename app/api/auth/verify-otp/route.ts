import { NextRequest, NextResponse } from "next/server";
import { getOTPByEmailAndPurpose, getAllOTPsByEmail, verifyOTP, incrementOTPAttempts, invalidateOTPs } from "@/lib/data/email-otp";

export async function POST(request: NextRequest) {
  try {
    const { email, otp, purpose = "signup" } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and OTP are required" },
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

   
    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, error: "OTP must be 6 digits" },
        { status: 400 }
      );
    }

    // Find valid OTP
    const allOTPs = await getAllOTPsByEmail(email);
    const otpRecord = allOTPs.find(
      (o) => o.otp === otp && o.purpose === purpose && !o.verified
    );

    if (!otpRecord) {
      // Get latest OTP for error messages
      const recentOTP = allOTPs.find((o) => o.purpose === purpose);

      if (!recentOTP) {
        return NextResponse.json(
          {
            success: false,
            error: "No verification code found. Please request a new one.",
          },
          { status: 404 }
        );
      }

      const isExpired = new Date(recentOTP.expires_at) < new Date();
      if (isExpired) {
        return NextResponse.json(
          {
            success: false,
            error: "Verification code has expired. Please request a new one.",
            expired: true,
          },
          { status: 410 }
        );
      }

      if (recentOTP.verified) {
        return NextResponse.json(
          {
            success: false,
            error: "This verification code has already been used.",
          },
          { status: 409 }
        );
      }

      if (recentOTP.attempts >= 5) {
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

      // Increment attempts
      const updated = await incrementOTPAttempts(recentOTP.id);
      const attemptsLeft = 5 - updated.attempts;

      return NextResponse.json(
        {
          success: false,
          error: `Invalid verification code. ${attemptsLeft} attempts remaining.`,
          attemptsLeft,
        },
        { status: 400 }
      );
    }

    // Check if expired
    const isExpired = new Date(otpRecord.expires_at) < new Date();
    if (isExpired) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Verification code has expired. Please request a new one.",
        },
        { status: 410 }
      );
    }

    // Check attempts
    if (otpRecord.attempts >= 5) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Verification code is no longer valid. Please request a new one.",
        },
        { status: 410 }
      );
    }

    // Verify OTP
    await verifyOTP(otpRecord.id);

    // Invalidate other OTPs for this email/purpose
    await invalidateOTPs(email, purpose);

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
