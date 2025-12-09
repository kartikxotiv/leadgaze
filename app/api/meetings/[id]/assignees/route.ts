import { NextRequest, NextResponse } from "next/server";
import {
  getMeetingAssignees,
  addMeetingAssignee,
  removeMeetingAssignee,
  updateMeetingAssignees,
} from "@/lib/data/meeting-assignees";
import { verifyAuth } from "@/lib/rbac/api-helpers";
import { getMeetingById } from "@/lib/data/meetings";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignees = await getMeetingAssignees(id);
    return NextResponse.json({ success: true, data: assignees });
  } catch (error: any) {
    console.error("Error fetching meeting assignees:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch meeting assignees",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { userId: currentUserId } = authResult;

    const { id } = await params;
    const body = await request.json();

    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const assignee = await addMeetingAssignee(id, body.userId, currentUserId);
    return NextResponse.json({ success: true, data: assignee });
  } catch (error: any) {
    console.error("Error adding meeting assignee:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to add assignee",
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
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { userId: currentUserId } = authResult;

    const { id } = await params;
    const body = await request.json();

    if (!Array.isArray(body.userIds)) {
      return NextResponse.json(
        { success: false, error: "userIds array is required" },
        { status: 400 }
      );
    }

    const assignees = await updateMeetingAssignees(
      id,
      body.userIds,
      currentUserId
    );
    return NextResponse.json({ success: true, data: assignees });
  } catch (error: any) {
    console.error("Error updating meeting assignees:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to update assignees",
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
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    await removeMeetingAssignee(id, userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing meeting assignee:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to remove assignee",
      },
      { status: 500 }
    );
  }
}
