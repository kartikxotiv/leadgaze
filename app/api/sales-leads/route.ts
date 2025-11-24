import { NextRequest, NextResponse } from "next/server";
import {
  createSalesLead,
  deleteSalesLead,
  getSalesLeadsPaginated,
  updateSalesLead,
} from "@/lib/data/sales-leads";

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

    const result = await getSalesLeadsPaginated(page, limit, filters, search);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error fetching sales leads:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to fetch sales leads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const salesLead = await createSalesLead(body);
    return NextResponse.json({ success: true, data: salesLead });
  } catch (error: any) {
    console.error("Error creating sales lead:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to create sales lead" },
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
      { success: false, error: error?.message ?? "Failed to update sales lead" },
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
      { success: false, error: error?.message ?? "Failed to delete sales lead" },
      { status: 500 }
    );
  }
}
