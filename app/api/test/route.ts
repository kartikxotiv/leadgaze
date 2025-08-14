import { NextResponse } from "next/server";
import { User } from "@/models";

export async function GET() {
  try {
    // Test database connection by counting users
    const userCount = await User.count();

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Database connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
