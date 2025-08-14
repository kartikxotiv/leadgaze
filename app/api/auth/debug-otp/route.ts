import { NextRequest, NextResponse } from "next/server";
import { EmailOTP } from "@/models";

export async function POST(request: NextRequest) {
  try {
    const { email, otp, purpose = "signup" } = await request.json();

    console.log("=== OTP DEBUG ===");
    console.log("Input:", { email, otp, purpose });

    // Find all OTP records for this email
    const allOTPs = await EmailOTP.findAll({
      where: { email: email.toLowerCase().trim() },
      order: [["createdAt", "DESC"]]
    });

    console.log("All OTPs for email:", allOTPs.map((otp: any) => ({
      id: otp.id,
      email: otp.email,
      otp: otp.otp,
      purpose: otp.purpose,
      attempts: otp.attempts,
      expiresAt: otp.expiresAt,
      verifiedAt: otp.verifiedAt,
      isExpired: otp.isExpired(),
      canAttempt: otp.canAttempt()
    })));

    // Try to find the specific OTP
    const specificOTP = await EmailOTP.findValidOTP(email, otp, purpose);
    console.log("Specific OTP found:", specificOTP ? {
      id: (specificOTP as any).id,
      email: (specificOTP as any).email,
      otp: (specificOTP as any).otp,
      purpose: (specificOTP as any).purpose,
      isExpired: (specificOTP as any).isExpired(),
      canAttempt: (specificOTP as any).canAttempt()
    } : null);

    return NextResponse.json({
      success: true,
      allOTPs: allOTPs.length,
      foundSpecific: !!specificOTP
    });

  } catch (error) {
    console.error("Debug OTP error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}