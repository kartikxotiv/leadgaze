import { NextRequest, NextResponse } from "next/server";
import {
  deleteSalesLead,
  getSalesLeadWithRelations,
  updateSalesLead,
} from "@/lib/data/sales-leads";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const salesLead = await getSalesLeadWithRelations(id);
    return NextResponse.json({ success: true, data: salesLead });
  } catch (error: any) {
    console.error("Error fetching sales lead:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to fetch sales lead" },
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
    const salesLead = await updateSalesLead(id, body);
    return NextResponse.json({ success: true, data: salesLead });
  } catch (error: any) {
    console.error("Error updating sales lead:", error);
    const statusCode = error.message?.includes("already exists") ? 409 : 500;
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to update sales lead",
      },
      { status: statusCode }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteSalesLead(id);
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
