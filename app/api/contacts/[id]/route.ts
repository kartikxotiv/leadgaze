import { NextRequest, NextResponse } from "next/server";
import {
  deleteSalesContact,
  getSalesContactById,
  updateSalesContact,
} from "@/lib/data/sales-contacts";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const salesContact = await getSalesContactById(id);
    return NextResponse.json({ success: true, data: salesContact });
  } catch (error: any) {
    console.error("Error fetching sales contact:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch sales contact",
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
    const salesContact = await updateSalesContact(id, body);
    return NextResponse.json({ success: true, data: salesContact });
  } catch (error: any) {
    console.error("Error updating sales contact:", error);
    const statusCode = error.message?.includes("already exists") ? 409 : 500;
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to update sales contact",
      },
      { status: statusCode }
    );
  }
}
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const salesContact = await deleteSalesContact(id);
    return NextResponse.json({ success: true, data: salesContact });
  } catch (error: any) {
    console.error("Error deleting sales contact:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to delete sales contact",
      },
      { status: 500 }
    );
  }
}
