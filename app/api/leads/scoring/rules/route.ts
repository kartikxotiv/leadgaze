import { NextRequest, NextResponse } from "next/server";
import { getScoringRulesByOrganization, createScoringRule } from "@/lib/data/scoring-rules";
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

    const activeOnly = isActive !== null ? isActive === "true" : true;

    const rules = await getScoringRulesByOrganization(organizationId, activeOnly);

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

    // Convert camelCase to snake_case
    const ruleDataSnake: any = {
      organization_id: organizationId,
      rule_name: ruleData.ruleName || ruleData.rule_name,
      rule_type: ruleData.ruleType || ruleData.rule_type,
      condition: ruleData.condition,
      points: ruleData.points,
      priority: ruleData.priority || 0,
      is_active: ruleData.isActive !== undefined ? ruleData.isActive : ruleData.is_active !== undefined ? ruleData.is_active : true,
      description: ruleData.description || null,
      metadata: ruleData.metadata || null,
      created_by: createdBy,
    };

    const rule = await createScoringRule(ruleDataSnake);

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
