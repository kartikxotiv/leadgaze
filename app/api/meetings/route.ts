import { NextRequest, NextResponse } from "next/server";
import {
  getMeetings,
  createMeeting,
  getMeetingsByLeadId,
} from "@/lib/data/meetings";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");

    if (leadId) {
      // Get meetings by lead ID
      const meetings = await getMeetingsByLeadId(leadId);
      return NextResponse.json({
        success: true,
        data: {
          meetings,
          pagination: {
            total: meetings.length,
            limit,
            offset: 0,
            pages: 1,
          },
        },
      });
    }

    // Get all meetings with pagination
    const result = await getMeetings(page, limit);

    return NextResponse.json({
      success: true,
      data: {
        meetings: result.data,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          pages: result.totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch meetings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields = ["title", "time"];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Get workspace_id from lead if leadId is provided
    let workspaceId = body.workspaceId || null;
    if (body.leadId && !workspaceId) {
      const { getSalesLeadById } = await import("@/lib/data/sales-leads");
      const lead = await getSalesLeadById(body.leadId);
      if (lead) {
        workspaceId = lead.workspace_id;
      }
    }

    // Convert camelCase to snake_case
    const meetingData: any = {
      lead_id: body.leadId || null,
      title: body.title,
      description: body.description || null,
      meeting_notes: body.meetingNotes || null,
      time: body.time,
      link: body.link || null,
      type: body.type || null,
      created_by: body.createdBy || null,
      workspace_id: workspaceId,
      status: body.status || "Pending",
    };

    const meeting = await createMeeting(meetingData);

    return NextResponse.json({
      success: true,
      data: meeting,
      message: "Meeting created successfully",
    });
  } catch (error) {
    console.error("Error creating meeting:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create meeting",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
