import { NextRequest, NextResponse } from "next/server";
import { getTaskById, updateTask, deleteTask } from "@/lib/data/tasks";
import { updateNote } from "@/lib/data/notes";
import { updateMeeting } from "@/lib/data/meetings";
import { verifyAuth } from "@/lib/rbac/api-helpers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await getTaskById(id);

    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: task });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch task" },
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

    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }

    // Convert camelCase to snake_case
    const updates: any = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.type !== undefined) updates.type = body.type;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.status !== undefined) updates.status = body.status;
    if (body.due_date !== undefined)
      updates.due_date = body.due_date
        ? new Date(body.due_date).toISOString()
        : null;
    if (body.assigned_to !== undefined)
      updates.assigned_to = body.assigned_to || null;
    if (body.lead_id !== undefined) updates.lead_id = body.lead_id || null;
    if (body.deal_id !== undefined) updates.deal_id = body.deal_id || null;
    if (body.completed_at !== undefined)
      updates.completed_at = body.completed_at || null;

    const updated = await updateTask(id, updates);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Task updated",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.status) {
      return NextResponse.json(
        { success: false, error: "status is required" },
        { status: 400 }
      );
    }

    // Map UI status to database status
    const mapStatusToDb = (status: string): string => {
      switch (status.toUpperCase()) {
        case "NEW":
          return "Pending";
        case "INPROGRESS":
          return "In Progress";
        case "DONE":
          return "Completed";
        default:
          return status;
      }
    };

    const dbStatus = mapStatusToDb(body.status);

    // Check if it's a note, meeting, or task based on ID prefix
    if (id.startsWith("note-")) {
      const noteId = id.replace("note-", "");
      const updated = await updateNote(noteId, { status: dbStatus });
      return NextResponse.json({
        success: true,
        data: updated,
        message: "Note status updated",
      });
    } else if (id.startsWith("meeting-")) {
      const meetingId = id.replace("meeting-", "");
      const updated = await updateMeeting(meetingId, { status: dbStatus });
      return NextResponse.json({
        success: true,
        data: updated,
        message: "Meeting status updated",
      });
    } else if (id.startsWith("task-")) {
      const taskId = id.replace("task-", "");
      const updated = await updateTask(taskId, { status: dbStatus });
      return NextResponse.json({
        success: true,
        data: updated,
        message: "Task status updated",
      });
    } else {
      // Try as direct task ID
      const updated = await updateTask(id, { status: dbStatus });
      return NextResponse.json({
        success: true,
        data: updated,
        message: "Task status updated",
      });
    }
  } catch (error: any) {
    console.error("Error updating task status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to update status",
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
    const task = await getTaskById(id);
    if (!task) {
      return NextResponse.json(
        { success: false, error: "Task not found" },
        { status: 404 }
      );
    }
    await deleteTask(id);
    return NextResponse.json({ success: true, message: "Task deleted" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
