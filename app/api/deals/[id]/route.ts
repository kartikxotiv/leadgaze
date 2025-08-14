import { NextRequest, NextResponse } from "next/server";
import { Deal, Lead, User } from "@/models";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deal = await Deal.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["firstName", "lastName", "email"],
        },
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
          ],
        },
      ],
    });

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

    // Validate stage field specifically  
    if (body.stage) {
      const validStages = ["qualification", "proposal", "negotiation", "decision", "closed_won", "closed_lost"];
      if (!validStages.includes(body.stage)) {
        return NextResponse.json(
          { success: false, error: `Invalid stage value: ${body.stage}. Must be one of: ${validStages.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const deal = await Deal.findByPk(id);
    if (!deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found" },
        { status: 404 }
      );
    }

    // Update deal
    await deal.update({
      ...body,
      updatedAt: new Date(),
    });

    // Fetch updated deal with associations
    const updatedDeal = await Deal.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["firstName", "lastName", "email"],
        },
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
          ],
        },
      ],
    });

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
    const deal = await Deal.findByPk(id);
    if (!deal) {
      return NextResponse.json(
        { success: false, error: "Deal not found" },
        { status: 404 }
      );
    }

    await deal.destroy();

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
