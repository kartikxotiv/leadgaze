import { NextRequest, NextResponse } from "next/server";
import {
  getReminderById,
  updateReminder,
  deleteReminder,
} from "@/lib/data/reminders";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reminder = await getReminderById(id);

    if (!reminder) {
      return NextResponse.json(
        { success: false, error: "Reminder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: reminder });
  } catch (error) {
    console.error("Error fetching reminder:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reminder",
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
    const payload: Record<string, any> = {};

    if (body.leadId !== undefined) payload.lead_id = body.leadId;
    if (body.content !== undefined) payload.content = body.content;
    if (body.remindAt !== undefined) payload.remind_at = body.remindAt;
    if (body.workspaceId !== undefined) payload.workspace_id = body.workspaceId;
    if (body.createdBy !== undefined) payload.created_by = body.createdBy;

    const updated = await updateReminder(id, payload);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update reminder",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const reminder = await getReminderById(id);
    if (!reminder) {
      return NextResponse.json(
        { success: false, error: "Reminder not found" },
        { status: 404 }
      );
    }

    await deleteReminder(id);
    return NextResponse.json({
      success: true,
      message: "Reminder deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete reminder",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
