import { NextRequest, NextResponse } from "next/server";
import {
  createLeadComment,
  getLeadComments,
} from "@/lib/data/lead-comments";

interface RouteContext {
  params: {
    id: string;
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Lead id is required" },
        { status: 400 }
      );
    }

    const comments = await getLeadComments(id);
    return NextResponse.json({ success: true, data: comments });
  } catch (error: any) {
    console.error("Error fetching lead comments:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to fetch lead comments" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Lead id is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    if (!body?.comment || typeof body.comment !== "string") {
      return NextResponse.json(
        { success: false, error: "Comment text is required" },
        { status: 400 }
      );
    }

    const newComment = await createLeadComment(id, body.comment, body?.createdBy);
    return NextResponse.json({ success: true, data: newComment }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating lead comment:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to create lead comment" },
      { status: 500 }
    );
  }
}

