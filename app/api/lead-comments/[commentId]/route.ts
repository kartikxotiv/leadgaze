import { NextRequest, NextResponse } from "next/server";
import { deleteLeadComment } from "@/lib/data/lead-comments";

interface RouteContext {
  params: {
    commentId: string;
  };
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
      { success: false, error: error?.message ?? "Failed to delete lead comment" },
      { status: 500 }
    );
  }
}

