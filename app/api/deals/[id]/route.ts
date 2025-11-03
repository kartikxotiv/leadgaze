import { NextRequest, NextResponse } from "next/server";
import { getDealById, updateDeal, deleteDeal } from "@/lib/data/deals";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deal = await getDealById(id);

    if (!deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deal,
    });
  } catch (error) {
    console.error("Error fetching deal:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch deal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

   
    if (body.stage) {
      const validStages = ["qualification", "proposal", "negotiation", "decision", "closed_won", "closed_lost"];
      if (!validStages.includes(body.stage)) {
        return NextResponse.json(
          { success: false, error: `Invalid stage value: ${body.stage}. Must be one of: ${validStages.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const deal = await getDealById(id);
    if (!deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found" },
        { status: 404 }
      );
    }

    // Convert camelCase to snake_case
    const updateData: any = {};
    if (body.title) updateData.title = body.title;
    if (body.value !== undefined) updateData.value = body.value;
    if (body.stage) updateData.stage_id = body.stage;
    if (body.stageId) updateData.stage_id = body.stageId;
    if (body.probability !== undefined) updateData.probability = body.probability;
    if (body.expectedCloseDate) updateData.expected_close_date = body.expectedCloseDate;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.metadata) updateData.metadata = body.metadata;

    const updatedDeal = await updateDeal(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedDeal,
      message: "Deal updated successfully",
    });
  } catch (error) {
    console.error("Error updating deal:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update deal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deal = await getDealById(id);
    if (!deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found" },
        { status: 404 }
      );
    }

    await deleteDeal(id);

    return NextResponse.json({
      success: true,
      message: "Deal deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting deal:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete deal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
