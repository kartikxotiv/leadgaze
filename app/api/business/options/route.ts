import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-client";

export async function GET() {
  try {
    // Fetch all businesses with business_type and industry
    const { data, error } = await supabase
      .from("business")
      .select("business_type, industry");

    if (error) {
      throw error;
    }

    // Extract unique business types
    const businessTypes = new Set<string>();
    const industries = new Set<string>();

    data?.forEach((business) => {
      if (business.business_type && business.business_type.trim()) {
        businessTypes.add(business.business_type.trim());
      }
      if (business.industry && business.industry.trim()) {
        industries.add(business.industry.trim());
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        businessTypes: Array.from(businessTypes).sort(),
        industries: Array.from(industries).sort(),
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
