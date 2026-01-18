import { NextRequest, NextResponse } from "next/server";
import { getDealsPaginated, createDeal, getDealById } from "@/lib/data/deals";
import { getLeadById } from "@/lib/data/leads";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const userId = searchParams.get("userId");
    const organizationId = searchParams.get("organizationId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    const filters: Record<string, any> = {};
    if (stage) filters.stage_id = stage;
    if (userId) filters.user_id = userId;

    // Note: workspaceId metadata filtering would need custom query
    // For now, we'll skip it or add it later if needed

    const result = await getDealsPaginated(organizationId, page, limit, 
      Object.keys(filters).length > 0 ? filters : undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        deals: result.data,
        pagination: {
          total: result.total,
          limit,
          offset: result.offset,
          pages: result.totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch deals",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

   
    const requiredFields = [
      "leadId",
      "title",
      "value",
      "userId",
      "organizationId",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate lead exists
    const lead = await getLeadById(body.leadId);
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    // Convert camelCase to snake_case
    const dealData: any = {
      lead_id: body.leadId,
      title: body.title,
      value: body.value,
      user_id: body.userId,
      organization_id: body.organizationId,
      stage_id: body.stageId || null,
      probability: body.probability || 0,
      expected_close_date: body.expectedCloseDate || null,
      notes: body.notes || null,
      metadata: body.metadata || null,
    };

    const deal = await createDeal(dealData);

    // Get created deal
    const createdDeal = await getDealById(deal.deal_id);

    return NextResponse.json({
      success: true,
      data: createdDeal,
      message: "Deal created successfully",
    });
  } catch (error) {
    console.error("Error creating deal:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create deal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
