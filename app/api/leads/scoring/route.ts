import { NextRequest, NextResponse } from "next/server";
import { LeadScoringEngine } from "@/lib/lead-scoring-engine";
import { getLeadScoresPaginated } from "@/lib/data/lead-scores";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, leadIds, organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    let results;

    if (leadId) {
     
      results = await LeadScoringEngine.calculateLeadScore(
        leadId,
        organizationId
      );
    } else if (leadIds && Array.isArray(leadIds)) {
     
      results = await LeadScoringEngine.calculateBatchScores(
        leadIds,
        organizationId
      );
    } else {
      return NextResponse.json(
        { success: false, error: "Either leadId or leadIds array is required" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: "Lead scores calculated successfully",
    });
  } catch (error) {
    console.error("Error calculating lead scores:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate lead scores",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const tier = searchParams.get("tier");
    const minScore = searchParams.get("minScore");
    const maxScore = searchParams.get("maxScore");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const filters: { tier?: string; minScore?: number; maxScore?: number } = {};
    if (tier) filters.tier = tier;
    if (minScore) filters.minScore = parseInt(minScore);
    if (maxScore) filters.maxScore = parseInt(maxScore);

    const result = await getLeadScoresPaginated(
      organizationId,
      page,
      limit,
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        scores: result.data,
        pagination: {
          total: result.total,
          limit,
          offset: result.offset,
          pages: result.totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching lead scores:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch lead scores",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
