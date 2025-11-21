import { NextRequest, NextResponse } from "next/server";
import {
  getMeetingById,
  updateMeeting,
  deleteMeeting,
} from "@/lib/data/meetings";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const meeting = await getMeetingById(id);

    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error("Error fetching meeting:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch meeting",
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

    const meeting = await getMeetingById(id);
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      );
    }

    // Convert camelCase to snake_case
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.meetingNotes !== undefined)
      updateData.meeting_notes = body.meetingNotes;
    if (body.time !== undefined) updateData.time = body.time;
    if (body.leadId !== undefined) updateData.lead_id = body.leadId;
    if (body.link !== undefined) updateData.link = body.link;
    if (body.type !== undefined) updateData.type = body.type;

    const updatedMeeting = await updateMeeting(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedMeeting,
      message: "Meeting updated successfully",
    });
  } catch (error) {
    console.error("Error updating meeting:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update meeting",
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
    const meeting = await getMeetingById(id);
    if (!meeting) {
      return NextResponse.json(
        { success: false, error: "Meeting not found" },
        { status: 404 }
      );
    }

    await deleteMeeting(id);

    return NextResponse.json({
      success: true,
      message: "Meeting deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete meeting",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
