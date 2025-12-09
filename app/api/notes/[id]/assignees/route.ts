import { NextRequest, NextResponse } from "next/server";
import {
  getNoteAssignees,
  addNoteAssignee,
  removeNoteAssignee,
  updateNoteAssignees,
} from "@/lib/data/note-assignees";
import { verifyAuth } from "@/lib/rbac/api-helpers";
import { getNoteById } from "@/lib/data/notes";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const assignees = await getNoteAssignees(id);
    return NextResponse.json({ success: true, data: assignees });
  } catch (error: any) {
    console.error("Error fetching note assignees:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch note assignees",
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

    const assignee = await addNoteAssignee(id, body.userId, currentUserId);
    return NextResponse.json({ success: true, data: assignee });
  } catch (error: any) {
    console.error("Error adding note assignee:", error);
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

    const assignees = await updateNoteAssignees(
      id,
      body.userIds,
      currentUserId
    );
    return NextResponse.json({ success: true, data: assignees });
  } catch (error: any) {
    console.error("Error updating note assignees:", error);
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

    await removeNoteAssignee(id, userId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing note assignee:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to remove assignee",
      },
      { status: 500 }
    );
  }
}
