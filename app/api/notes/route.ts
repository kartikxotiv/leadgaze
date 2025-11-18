import { NextRequest, NextResponse } from "next/server";
import {
  getNotesByWorkspaceId,
  createNote,
  getNotesByLeadId,
} from "@/lib/data/notes";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const leadId = searchParams.get("leadId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (leadId) {
      // Get notes by lead ID
      const notes = await getNotesByLeadId(leadId);
      return NextResponse.json({
        success: true,
        data: {
          notes,
          pagination: {
            total: notes.length,
            limit,
            offset: 0,
            pages: 1,
          },
        },
      });
    }

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "Workspace ID or Lead ID is required" },
        { status: 400 }
      );
    }

    const result = await getNotesByWorkspaceId(workspaceId, page, limit);

    return NextResponse.json({
      success: true,
      data: {
        notes: result.data,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          pages: result.totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch notes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields = ["leadId", "title", "description", "workspaceId"];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Convert camelCase to snake_case
    const noteData: any = {
      lead_id: body.leadId,
      title: body.title,
      description: body.description,
      workspace_id: body.workspaceId,
      created_by: body.createdBy || null,
    };

    const note = await createNote(noteData);

    return NextResponse.json({
      success: true,
      data: note,
      message: "Note created successfully",
    });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create note",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

