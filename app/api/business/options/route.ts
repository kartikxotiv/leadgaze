import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function GET() {
  try {
    // Fetch all businesses with business_type and industry
    const { data: businessTypes, error: businessTypesError } = await supabase
      .from("business_type")
      .select("name").order("name", { ascending: true });

    if (businessTypesError) {
      throw businessTypesError;
    }

    const { data: industries, error: industriesError } = await supabase
      .from("industry")
      .select("name").order("name", { ascending: true });

    if (industriesError) {
      throw industriesError;
    }

    return NextResponse.json({
      success: true,
      data: {
        businessTypes: businessTypes.map((item) => item.name),
        industries: industries.map((item) => item.name),
      },
    });
  } catch (error: any) {
    console.error("Error fetching business options:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch business options",
      },
      { status: 500 }
    );
  }
}
