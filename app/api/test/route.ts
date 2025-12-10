import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function GET() {
  try {
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      userCount: userCount || 0,
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
