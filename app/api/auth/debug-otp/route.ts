import { NextRequest, NextResponse } from "next/server";
import { getAllOTPsByEmail, getOTPByEmailAndPurpose } from "@/lib/data/email-otp";

export async function POST(request: NextRequest) {
  try {
    const { email, otp, purpose = "signup" } = await request.json();

    console.log("=== OTP DEBUG ===");
    console.log("Input:", { email, otp, purpose });

    const allOTPs = await getAllOTPsByEmail(email.toLowerCase().trim());

    console.log("All OTPs for email:", allOTPs.map((otp) => {
      const isExpired = new Date(otp.expires_at) < new Date();
      const canAttempt = otp.attempts < 5 && !otp.verified && !isExpired;
      
      return {
        id: otp.id,
        email: otp.email,
        otp: otp.otp,
        purpose: otp.purpose,
        attempts: otp.attempts,
        expiresAt: otp.expires_at,
        verifiedAt: otp.verified_at,
        isExpired,
        canAttempt
      };
    }));

    // Find specific OTP
    const specificOTP = allOTPs.find(
      (o) => o.otp === otp && o.purpose === purpose && !o.verified && new Date(o.expires_at) > new Date()
    );
    
    const isExpired = specificOTP ? new Date(specificOTP.expires_at) < new Date() : false;
    const canAttempt = specificOTP ? specificOTP.attempts < 5 && !specificOTP.verified && !isExpired : false;
    
    console.log("Specific OTP found:", specificOTP ? {
      id: specificOTP.id,
      email: specificOTP.email,
      otp: specificOTP.otp,
      purpose: specificOTP.purpose,
      isExpired,
      canAttempt
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