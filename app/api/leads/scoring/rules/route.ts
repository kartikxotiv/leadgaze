import { NextRequest, NextResponse } from "next/server";
import { ScoringRule } from "@/models";
import { LeadScoringEngine } from "@/lib/lead-scoring-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const isActive = searchParams.get("isActive");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const whereClause: any = { organizationId };
    if (isActive !== null) whereClause.isActive = isActive === "true";

    const rules = await ScoringRule.findAll({
      where: whereClause,
      order: [["priority", "ASC"]],
    });

    return NextResponse.json({
      success: true,
      data: rules,
    });
  } catch (error) {
    console.error("Error fetching scoring rules:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch scoring rules",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, createdBy, initializeDefaults, ...ruleData } = body;

    if (!organizationId || !createdBy) {
      return NextResponse.json(
        {
          success: false,
          error: "Organization ID and created by user ID are required",
        },
        { status: 400 }
      );
    }

    if (initializeDefaults) {
     
      await LeadScoringEngine.initializeDefaultRules(organizationId, createdBy);

      return NextResponse.json({
        success: true,
        message: "Default scoring rules initialized successfully",
      });
    }

   
    const requiredFields = ["ruleName", "ruleType", "condition", "points"];
    for (const field of requiredFields) {
      if (!ruleData[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const rule = await ScoringRule.create({
      ...ruleData,
      organizationId,
      createdBy,
    });

    return NextResponse.json({
      success: true,
      data: rule,
      message: "Scoring rule created successfully",
    });
  } catch (error) {
    console.error("Error creating scoring rule:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create scoring rule",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
