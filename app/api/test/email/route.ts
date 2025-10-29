import { NextResponse } from "next/server";
import { emailService } from "@/lib/email-service";

export async function GET() {
  try {
   
    await emailService.ensureInitialized();

   
    const isConfigured = await emailService.testEmailConfiguration();

    return NextResponse.json({
      success: true,
      emailConfigured: isConfigured,
      message: isConfigured
        ? "Email service is properly configured and ready to send emails"
        : "Email service is not configured. Check your environment variables.",
      envVars: {
        hasEmailHost: !!process.env.EMAIL_HOST,
        hasEmailUser: !!process.env.EMAIL_USER,
        hasGmailUser: !!process.env.GMAIL_USER,
        hasSendGridKey: !!process.env.SENDGRID_API_KEY,
      },
    });
  } catch (error) {
    console.error("Email test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to test email service",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
