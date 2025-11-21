import { NextRequest, NextResponse } from "next/server";
import {
  getLeadAssignees,
  addLeadAssignee,
  removeLeadAssignee,
  updateLeadAssignees,
} from "@/lib/data/lead-assignees";

/**
 * GET /api/sales-leads/[id]/assignees
 * Get all assignees for a lead
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const assignees = await getLeadAssignees(id);
    return NextResponse.json({ success: true, data: assignees });
  } catch (error: any) {
    console.error("Error fetching lead assignees:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch lead assignees",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sales-leads/[id]/assignees
 * Add a new assignee to a lead
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const assignee = await addLeadAssignee(id, body.userId);
    return NextResponse.json({ success: true, data: assignee });
  } catch (error: any) {
    console.error("Error adding lead assignee:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to add assignee" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/sales-leads/[id]/assignees
 * Update all assignees for a lead (replace)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!Array.isArray(body.userIds)) {
      return NextResponse.json(
        { success: false, error: "userIds array is required" },
        { status: 400 }
      );
    }

    const assignees = await updateLeadAssignees(id, body.userIds);
    return NextResponse.json({ success: true, data: assignees });
  } catch (error: any) {
    console.error("Error updating lead assignees:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to update assignees",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sales-leads/[id]/assignees
 * Remove an assignee from a lead
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId query parameter is required" },
        { status: 400 }
      );
    }

    await removeLeadAssignee(id, userId);
    return NextResponse.json({ success: true, data: { removed: true } });
  } catch (error: any) {
    console.error("Error removing lead assignee:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to remove assignee" },
      { status: 500 }
    );
  }
}

