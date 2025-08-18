import { type NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    // This system doesn't use a separate pipeline_stages table
    // Deals have direct stage enum values
    const stages = [
      {
        id: "qualification",
        name: "Qualification",
        position: 1,
        color: "bg-blue-500",
        is_active: true,
      },
      {
        id: "proposal",
        name: "Proposal",
        position: 2,
        color: "bg-purple-500",
        is_active: true,
      },
      {
        id: "negotiation",
        name: "Negotiation",
        position: 3,
        color: "bg-orange-500",
        is_active: true,
      },
      {
        id: "decision",
        name: "Decision",
        position: 4,
        color: "bg-yellow-500",
        is_active: true,
      },
      {
        id: "closed_won",
        name: "Closed Won",
        position: 5,
        color: "bg-green-500",
        is_active: true,
      },
      {
        id: "closed_lost",
        name: "Closed Lost",
        position: 6,
        color: "bg-red-500",
        is_active: true,
      },
    ];

    return NextResponse.json({
      data: stages,
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // This system uses fixed pipeline stages defined in the Deal model enum
    // Custom stage creation would require modifying the Deal model enum
    return NextResponse.json(
      {
        success: false,
        error:
          "Custom pipeline stages not supported. System uses fixed stages: qualification, proposal, negotiation, decision, closed_won, closed_lost",
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
