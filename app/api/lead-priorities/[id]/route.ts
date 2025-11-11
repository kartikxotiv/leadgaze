import { NextRequest, NextResponse } from "next/server";
import {
  deleteLeadPriority,
  updateLeadPriority,
} from "@/lib/data/lead-priorities";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Priority id is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const priority = await updateLeadPriority(id, {
      name: body?.name,
      color: body?.color,
    });

    return NextResponse.json({ success: true, data: priority });
  } catch (error: any) {
    console.error("Error updating lead priority:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to update lead priority" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Priority id is required" },
        { status: 400 }
      );
    }

    await deleteLeadPriority(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting lead priority:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to delete lead priority" },
      { status: 500 }
    );
  }
}

