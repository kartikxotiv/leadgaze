import { type NextRequest, NextResponse } from "next/server";
import { getLeadConfigsByType } from "@/lib/data/lead-config";
import { getLeadsPaginated } from "@/lib/data/leads";
import { supabase } from "@/lib/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Get active lead sources
    const leadSources = await getLeadConfigsByType("source");

    // Get source statistics
    const sourceStats = [];

    for (const source of leadSources) {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('source_id', source.id);

      if (dateFrom) {
        query = query.gte('created_at', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', new Date(dateTo).toISOString());
      }

      const { count, error } = await query;
      
      if (error) throw error;

      const leadCount = count || 0;

      if (leadCount > 0) {
        sourceStats.push({
          sourceId: source.id,
          sourceName: source.entity_value,
          sourceLabel: source.description || source.entity_value,
          count: leadCount,
          percentage: 0,
        });
      }
    }

   
    const totalLeads = sourceStats.reduce((sum, stat) => sum + stat.count, 0);
    sourceStats.forEach((stat) => {
      stat.percentage =
        totalLeads > 0 ? Math.round((stat.count / totalLeads) * 100) : 0;
    });

   
    sourceStats.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        sources: sourceStats,
        totalLeads,
        timeframe: {
          from: dateFrom,
          to: dateTo,
        },
      },
    });
  } catch (error) {
    console.error("Lead sources analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
