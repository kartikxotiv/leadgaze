import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/rbac/api-helpers";
import { getUnifiedTasksByWorkspace } from "@/lib/data/tasks";

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const unifiedTasks = await getUnifiedTasksByWorkspace(workspaceId);

    return NextResponse.json({
      success: true,
      data: unifiedTasks,
    });
  } catch (error) {
    console.error("Error fetching unified tasks:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch unified tasks",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
