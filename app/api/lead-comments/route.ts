import { NextRequest, NextResponse } from "next/server";
import { createLeadComment, getLeadComments } from "@/lib/data/lead-comments";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("leadId");

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: "Lead ID is required" },
        { status: 400 }
      );
    }

    const comments = await getLeadComments(leadId);

    return NextResponse.json({
      success: true,
      data: comments,
    });
  } catch (error: any) {
    console.error("Error fetching lead comments:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch lead comments",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, comment, createdBy } = body;

    if (!leadId) {
      return NextResponse.json(
        { success: false, error: "Lead ID is required" },
        { status: 400 }
      );
    }

    if (!comment || typeof comment !== "string") {
      return NextResponse.json(
        { success: false, error: "Comment text is required" },
        { status: 400 }
      );
    }

    const newComment = await createLeadComment(leadId, comment, createdBy);

    return NextResponse.json({
      success: true,
      data: newComment,
    });
  } catch (error: any) {
    console.error("Error creating lead comment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to create lead comment",
      },
      { status: 500 }
    );
  }
}
