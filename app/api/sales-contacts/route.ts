import { NextRequest, NextResponse } from "next/server";
import { getSalesContactsPaginated, createSalesContact, updateSalesContact, deleteSalesContact } from "@/lib/data/sales-contacts";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    let filters = {};

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

    const result = await getSalesContactsPaginated(page, limit, filters, search);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error fetching sales contacts:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch sales contacts" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const salesContact = await createSalesContact(body);
    return NextResponse.json({ success: true, data: salesContact });
  } catch (error: any) {
    console.error("Error creating sales contact:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create sales contact" },
      { status: 500 }
    );
  }
}       
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const salesContact = await updateSalesContact(body.id, body);
    return NextResponse.json({ success: true, data: salesContact });
  } catch (error: any) {
    console.error("Error updating sales contact:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update sales contact" },
      { status: 500 }
    );
  }
}   
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const salesContact = await deleteSalesContact(body.id);
    return NextResponse.json({ success: true, data: salesContact });
  } catch (error: any) {
    console.error("Error deleting sales contact:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete sales contact" },
      { status: 500 }
    );
  }
}
