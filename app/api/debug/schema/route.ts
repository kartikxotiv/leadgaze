import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function GET(request: NextRequest) {
  try {
    // Get table names using Supabase
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    // For schema queries, we need to use RPC or direct SQL
    // Since Supabase doesn't directly support information_schema queries,
    // we'll return basic info or mark this route as deprecated
    return NextResponse.json({
      success: true,
      message: "Schema debug route - Use Supabase dashboard for schema inspection",
      data: {
        note: "Use Supabase Dashboard > Database > Tables for schema details",
        tables: tablesData || [],
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
