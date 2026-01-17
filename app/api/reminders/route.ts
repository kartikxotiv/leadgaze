import { NextRequest, NextResponse } from "next/server";
import {
  getRemindersByWorkspaceId,
  createReminder,
  getRemindersByLeadId,
} from "@/lib/data/reminders";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");
    const leadId = searchParams.get("leadId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (leadId) {
      const reminders = await getRemindersByLeadId(leadId);
      return NextResponse.json({
        success: true,
        data: {
          reminders,
          pagination: {
            total: reminders.length,
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

    const result = await getRemindersByWorkspaceId(workspaceId, page, limit);

    return NextResponse.json({
      success: true,
      data: {
        reminders: result.data,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          pages: result.totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch reminders",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const payload = {
      lead_id: body.leadId,
      content: body.content,
      remind_at: body.remindAt,
      workspace_id: body.workspaceId ?? null,
      created_by: body.createdBy ?? null,
    };
    const reminder = await createReminder(payload);
    return NextResponse.json({ success: true, data: reminder });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create reminder",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

