import { NextRequest, NextResponse } from "next/server";
import {
  getLeadMediaById,
  updateLeadMedia,
  deleteLeadMedia,
} from "@/lib/data/lead-media";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const media = await getLeadMediaById(id);

    if (!media) {
      return NextResponse.json(
        { success: false, error: "Media not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: media,
    });
  } catch (error) {
    console.error("Error fetching media:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch media",
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

    const media = await getLeadMediaById(id);
    if (!media) {
      return NextResponse.json(
        { success: false, error: "Media not found" },
        { status: 404 }
      );
    }

    // Convert camelCase to snake_case
    const updateData: any = {};
    if (body.mediaUrl !== undefined) updateData.media_url = body.mediaUrl;
    if (body.mediaType !== undefined) updateData.media_type = body.mediaType;
    if (body.leadId !== undefined) updateData.lead_id = body.leadId;

    const updatedMedia = await updateLeadMedia(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedMedia,
      message: "Media updated successfully",
    });
  } catch (error) {
    console.error("Error updating media:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update media",
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
    const media = await getLeadMediaById(id);
    if (!media) {
      return NextResponse.json(
        { success: false, error: "Media not found" },
        { status: 404 }
      );
    }

    await deleteLeadMedia(id);

    return NextResponse.json({
      success: true,
      message: "Media deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting media:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete media",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

