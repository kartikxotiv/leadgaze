import { NextRequest, NextResponse } from "next/server";
import { getLeadMediaByLeadId, createLeadMedia } from "@/lib/data/lead-media";

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

    const media = await getLeadMediaByLeadId(leadId);

    return NextResponse.json({
      success: true,
      data: {
        media,
        total: media.length,
      },
    });
  } catch (error) {
    console.error("Error fetching lead media:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch lead media",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requiredFields = ["leadId", "mediaUrl", "mediaType"];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Convert camelCase to snake_case
    const mediaData: any = {
      lead_id: body.leadId,
      media_url: body.mediaUrl,
      media_type: body.mediaType,
      created_by: body.createdBy || null,
    };

    const media = await createLeadMedia(mediaData);

    return NextResponse.json({
      success: true,
      data: media,
      message: "Media uploaded successfully",
    });
  } catch (error) {
    console.error("Error creating lead media:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to upload media",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

