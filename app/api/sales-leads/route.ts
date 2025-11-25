import { NextRequest, NextResponse } from "next/server";
import {
  createSalesLead,
  deleteSalesLead,
  getSalesLeadsPaginated,
  updateSalesLead,
} from "@/lib/data/sales-leads";
import { verifyAuth } from "@/lib/rbac/api-helpers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = parseInt(searchParams.get("limit") ?? "20", 10);
    const search = searchParams.get("search") ?? "";
    let filters: Record<string, any> = {};

    const rawFilters = searchParams.get("filters");
    if (rawFilters) {
      try {
        filters = JSON.parse(rawFilters);
      } catch {
        return NextResponse.json(
          { success: false, error: "Invalid filters payload" },
          { status: 400 }
        );
      }
    }

    // Get current user from token if available
    let userId: string | undefined;
    try {
      const authResult = await verifyAuth(request);
      if (!(authResult instanceof NextResponse)) {
        userId = authResult.userId;
        console.log(`🔐 Extracted userId from token: ${userId}`);
      }
    } catch (error) {
      // If token invalid, continue without userId filter
      console.warn("⚠️ Could not extract userId from token:", error);
    }

    // Check if filtering by assigned user (can be from query param or current user)
    const assignedTo = searchParams.get("assignedTo");
    const userIdToFilter = assignedTo || userId;

    console.log(
      `🔍 Filtering sales leads - userIdToFilter: ${userIdToFilter}, assignedTo param: ${assignedTo}, token userId: ${userId}`
    );

    const result = await getSalesLeadsPaginated(
      page,
      limit,
      filters,
      search,
      userIdToFilter
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error fetching sales leads:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch sales leads",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get current user from token
    const authResult = await verifyAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { userId: currentUserId } = authResult;

    const body = await request.json();

    // Set created_by if not provided
    if (!body.created_by) {
      body.created_by = currentUserId;
    }

    const salesLead = await createSalesLead(body);

    // Automatically assign the lead to the creator
    try {
      const { addLeadAssignee } = await import("@/lib/data/lead-assignees");
      console.log(
        `🔗 Auto-assigning lead ${salesLead.id} to user ${currentUserId}`
      );
      await addLeadAssignee(salesLead.id, currentUserId, currentUserId);
      console.log(
        `✅ Successfully assigned lead ${salesLead.id} to user ${currentUserId}`
      );
    } catch (assignError: any) {
      // Log error but don't fail the creation
      console.error("❌ Failed to auto-assign lead to creator:", {
        leadId: salesLead.id,
        userId: currentUserId,
        error: assignError?.message || assignError,
        code: assignError?.code,
      });
      // If it's just a duplicate assignment, that's okay
      if (assignError?.message?.includes("already assigned")) {
        console.log("ℹ️ Lead already assigned to user, continuing...");
      }
    }

    return NextResponse.json({ success: true, data: salesLead });
  } catch (error: any) {
    console.error("Error creating sales lead:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to create sales lead",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.id) {
      return NextResponse.json(
        { success: false, error: "Lead id is required" },
        { status: 400 }
      );
    }
    const salesLead = await updateSalesLead(String(body.id), body);
    return NextResponse.json({ success: true, data: salesLead });
  } catch (error: any) {
    console.error("Error updating sales lead:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to update sales lead",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.id) {
      return NextResponse.json(
        { success: false, error: "Lead id is required" },
        { status: 400 }
      );
    }
    const result = await deleteSalesLead(String(body.id));
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error deleting sales lead:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to delete sales lead",
      },
      { status: 500 }
    );
  }
}
