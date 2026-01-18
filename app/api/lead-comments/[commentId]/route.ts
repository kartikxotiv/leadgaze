import { NextRequest, NextResponse } from "next/server";
import { deleteLeadComment, getLeadCommentById, updateLeadComment } from "@/lib/data/lead-comments";

interface RouteContext {
  params: {
    commentId: string;
  };
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { commentId } = params;
    if (!commentId) {
      return NextResponse.json(
        { success: false, error: "Comment id is required" },
        { status: 400 }
      );
    }

    const comment = await getLeadCommentById(commentId);
    if (!comment) {
      return NextResponse.json(
        { success: false, error: "Comment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: comment });
  } catch (error: any) {
    console.error("Error fetching lead comment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch lead comment",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { commentId } = params;
    if (!commentId) {
      return NextResponse.json(
        { success: false, error: "Comment id is required" },
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

    const updatedComment = await updateLeadComment(commentId, body.comment);
    return NextResponse.json({ success: true, data: updatedComment });
  } catch (error: any) {
    console.error("Error updating lead comment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to update lead comment",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { commentId } = params;
    if (!commentId) {
      return NextResponse.json(
        { success: false, error: "Comment id is required" },
        { status: 400 }
      );
    }

    await deleteLeadComment(commentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting lead comment:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to delete lead comment",
      },
      { status: 500 }
    );
  }
}
