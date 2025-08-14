import { type NextRequest, NextResponse } from "next/server";
import { Lead, LeadConfig } from "@/models";
import { Op } from "sequelize";

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

    // Build date filter
    const dateFilter: any = {};
    if (dateFrom) {
      dateFilter[Op.gte] = new Date(dateFrom);
    }
    if (dateTo) {
      dateFilter[Op.lte] = new Date(dateTo);
    }

    // Get all lead sources
    const leadSources = await LeadConfig.findAll({
      where: { entityType: "source", isActive: true },
      order: [["entityValue", "ASC"]],
    });

    // Get lead counts by source
    const sourceStats = [];

    for (const source of leadSources) {
      const whereClause: any = {
        organizationId,
        sourceId: (source as any).id,
      };

      if (Object.keys(dateFilter).length > 0) {
        whereClause.createdAt = dateFilter;
      }

      const count = await Lead.count({ where: whereClause });

      if (count > 0) {
        sourceStats.push({
          sourceId: (source as any).id,
          sourceName: (source as any).entityValue,
          sourceLabel:
            (source as any).description || (source as any).entityValue,
          count,
          percentage: 0, // Will calculate after getting total
        });
      }
    }

    // Calculate percentages
    const totalLeads = sourceStats.reduce((sum, stat) => sum + stat.count, 0);
    sourceStats.forEach((stat) => {
      stat.percentage =
        totalLeads > 0 ? Math.round((stat.count / totalLeads) * 100) : 0;
    });

    // Sort by count descending
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
