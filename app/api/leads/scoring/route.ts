import { NextRequest, NextResponse } from "next/server";
import { LeadScoringEngine } from "@/lib/lead-scoring-engine";
import { LeadScore, Lead } from "@/models";

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
      // Calculate score for single lead
      results = await LeadScoringEngine.calculateLeadScore(
        leadId,
        organizationId
      );
    } else if (leadIds && Array.isArray(leadIds)) {
      // Calculate scores for multiple leads
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
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const whereClause: any = { organizationId };

    if (tier) whereClause.tier = tier;
    if (minScore)
      whereClause.totalScore = {
        ...whereClause.totalScore,
        $gte: parseInt(minScore),
      };
    if (maxScore)
      whereClause.totalScore = {
        ...whereClause.totalScore,
        $lte: parseInt(maxScore),
      };

    const { count, rows: scores } = await LeadScore.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Lead,
          as: "lead",
          attributes: [
            "leadId",
            "firstName",
            "lastName",
            "businessName",
            "email",
            "phone",
            "jobTitle",
            "source",
          ],
        },
      ],
      order: [["totalScore", "DESC"]],
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        scores,
        pagination: {
          total: count,
          limit,
          offset,
          pages: Math.ceil(count / limit),
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
