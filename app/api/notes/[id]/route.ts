import { NextRequest, NextResponse } from "next/server";
import { getNoteById, updateNote, deleteNote } from "@/lib/data/notes";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const note = await getNoteById(id);

    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: note,
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch note",
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

    const note = await getNoteById(id);
    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    // Convert camelCase to snake_case
    const updateData: any = {};
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.leadId !== undefined) updateData.lead_id = body.leadId;
    if (body.dueDate !== undefined)
      updateData.due_date = body.dueDate
        ? new Date(body.dueDate).toISOString()
        : null;
    if (body.status !== undefined) updateData.status = body.status;

    const updatedNote = await updateNote(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedNote,
      message: "Note updated successfully",
    });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update note",
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
    const note = await getNoteById(id);
    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found" },
        { status: 404 }
      );
    }

    await deleteNote(id);

    return NextResponse.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete note",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
