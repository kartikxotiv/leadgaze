import { NextRequest, NextResponse } from "next/server";
import { Notification } from "@/models";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    const body = await request.json();

    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
      return NextResponse.json(
        { success: false, error: "Notification not found" },
        { status: 404 }
      );
    }

    await notification.update(body);

    return NextResponse.json({
      success: true,
      data: notification,
      message: "Notification updated successfully",
    });
  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update notification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;

    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
      return NextResponse.json(
        { success: false, error: "Notification not found" },
        { status: 404 }
      );
    }

    await notification.destroy();

    return NextResponse.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete notification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
