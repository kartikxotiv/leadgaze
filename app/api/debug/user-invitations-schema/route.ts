import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function GET(request: NextRequest) {
  try {
    // Supabase doesn't support direct information_schema queries
    // Return basic info and suggest using Supabase dashboard
    return NextResponse.json({
      success: true,
      message: "Use Supabase Dashboard > Database > Tables > user_invitations for schema details",
      data: {
        note: "Schema inspection available in Supabase Dashboard",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Schema debug error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get schema info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
