import { NextRequest, NextResponse } from "next/server";
import { getActivityById, updateActivity, deleteActivity } from "@/lib/data/activities";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const activity = await getActivityById(id);

    if (!activity) {
      return NextResponse.json(
        { success: false, error: "Activity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch activity",
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

    const activity = await getActivityById(id);
    if (!activity) {
      return NextResponse.json(
        { success: false, error: "Activity not found" },
        { status: 404 }
      );
    }

    // Convert camelCase to snake_case
    const updateData: any = {};
    if (body.activityType) updateData.activity_type = body.activityType;
    if (body.relatedType) updateData.related_type = body.relatedType;
    if (body.relatedId) updateData.related_id = body.relatedId;
    if (body.subject) updateData.subject = body.subject;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.outcome) updateData.outcome = body.outcome;
    if (body.priority) updateData.priority = body.priority;
    if (body.metadata) updateData.metadata = body.metadata;

    const updatedActivity = await updateActivity(id, updateData);

    return NextResponse.json({
      success: true,
      data: updatedActivity,
      message: "Activity updated successfully",
    });
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update activity",
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
    const activity = await getActivityById(id);
    if (!activity) {
      return NextResponse.json(
        { success: false, error: "Activity not found" },
        { status: 404 }
      );
    }

    await deleteActivity(id);

    return NextResponse.json({
      success: true,
      message: "Activity deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting activity:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete activity",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
