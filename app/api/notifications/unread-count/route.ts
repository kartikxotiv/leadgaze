import { NextRequest, NextResponse } from "next/server";
import { NotificationEngine } from "@/lib/notification-engine";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const result = await NotificationEngine.getUserNotifications(userId, {
      unreadOnly: true,
      limit: 1,
    });

    return NextResponse.json({
      success: true,
      data: {
        unreadCount: result.unreadCount,
      },
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch unread count",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
