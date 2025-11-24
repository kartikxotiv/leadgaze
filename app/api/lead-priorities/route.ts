import { NextRequest, NextResponse } from "next/server";
import {
  createLeadPriority,
  getLeadPriorities,
} from "@/lib/data/lead-priorities";

export async function GET() {
  try {
    const priorities = await getLeadPriorities();
    return NextResponse.json({ success: true, data: priorities });
  } catch (error: any) {
    console.error("Error fetching lead priorities:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to fetch lead priorities" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.name || !body?.color) {
      return NextResponse.json(
        { success: false, error: "Name and color are required" },
        { status: 400 }
      );
    }

    const priority = await createLeadPriority({
      name: body.name,
      color: body.color,
    });

    return NextResponse.json({ success: true, data: priority }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating lead priority:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to create lead priority" },
      { status: 500 }
    );
  }
}
