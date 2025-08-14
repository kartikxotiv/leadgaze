import { NextRequest, NextResponse } from "next/server";
import { Notification } from "@/models";
import { NotificationEngine } from "@/lib/notification-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const types = searchParams.getAll("types");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const result = await NotificationEngine.getUserNotifications(userId, {
      limit,
      offset,
      unreadOnly,
      types: types.length > 0 ? types : undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        pagination: {
          limit,
          offset,
          total: result.notifications.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch notifications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetUserId, ...notificationData } = body;

    if (
      !targetUserId ||
      !notificationData.type ||
      !notificationData.title ||
      !notificationData.message
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: targetUserId, type, title, message",
        },
        { status: 400 }
      );
    }

    const notification = await NotificationEngine.sendNotification({
      userId: targetUserId,
      ...notificationData,
    });

    return NextResponse.json({
      success: true,
      data: notification,
      message: "Notification sent successfully",
    });
  } catch (error) {
    console.error("Error sending notification:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send notification",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
