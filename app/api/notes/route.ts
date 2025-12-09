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

    // Try to create note with optional fields first (if migration has been run)
    // If it fails due to missing columns, retry without them
    let note;
    try {
      // Add optional fields if provided
      if (body.dueDate !== undefined) {
        noteData.due_date = body.dueDate ? new Date(body.dueDate).toISOString() : null;
      }
      if (body.status !== undefined) {
        noteData.status = body.status;
      }
      
      note = await createNote(noteData);
    } catch (firstError: any) {
      // If error is about missing columns (migration not run), retry without optional fields
      if (
        firstError?.code === "42703" ||
        firstError?.message?.includes("column") ||
        firstError?.message?.includes("does not exist")
      ) {
        console.warn(
          "Optional fields (due_date, status) not available - migration may not have been run. Creating note without them."
        );
        
        // Retry with only required fields
        const basicNoteData = {
          lead_id: body.leadId,
          title: body.title,
          description: body.description,
          workspace_id: body.workspaceId,
          created_by: body.createdBy || null,
        };
        
        note = await createNote(basicNoteData);
      } else {
        // Re-throw if it's a different error
        throw firstError;
      }
    }

    return NextResponse.json({
      success: true,
      data: note,
      message: "Note created successfully",
    });
  } catch (error: any) {
    console.error("Error creating note:", error);
    
    // Provide more detailed error information
    let errorMessage = "Failed to create note";
    let errorDetails = error?.message || "Unknown error";
    
    // Check for common database errors
    if (error?.code === "42703" || error?.message?.includes("column") || error?.message?.includes("does not exist")) {
      errorMessage = "Database schema error - migration may not have been run";
      errorDetails = "The notes table is missing required columns. Please run the migration: 20251204000000_add_task_features.sql";
    } else if (error?.code === "23503" || error?.message?.includes("foreign key")) {
      errorMessage = "Invalid reference - lead or workspace not found";
      errorDetails = error?.message || "The referenced lead or workspace does not exist";
    } else if (error?.code === "23502" || error?.message?.includes("not null")) {
      errorMessage = "Missing required field";
      errorDetails = error?.message || "A required field is missing";
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}
