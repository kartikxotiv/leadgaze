import { NextRequest, NextResponse } from "next/server";
import { getAccountsPaginated } from "@/lib/data/accounts";
import { verifyAuth } from "@/lib/rbac/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const workspaceId = searchParams.get("workspaceId") ?? "";
    const search = searchParams.get("search") ?? "";

    if (!workspaceId) {
      return NextResponse.json(
        { success: false, error: "workspaceId is required" },
        { status: 400 }
      );
    }

    const filters: Record<string, any> = {
      workspace_id: workspaceId,
    };

    const result = await getAccountsPaginated(page, limit, filters, search);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch accounts",
      },
      { status: 500 }
    );
  }
}
