import { NextRequest, NextResponse } from "next/server";
import {
  getBusinessPaginated,
  createBusiness,
  updateBusiness,
  deleteBusiness,
} from "@/lib/data/business";

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

    const result = await getBusinessPaginated(page, limit, filters, search);
    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error fetching business:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to fetch business",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const business = await createBusiness(body);
    return NextResponse.json({ success: true, data: business });
  } catch (error: any) {
    console.error("Error creating business:", error);
    const statusCode = error.message?.includes("already exists") ? 409 : 500;
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to create business",
      },
      { status: statusCode }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.id) {
      return NextResponse.json(
        { success: false, error: "Business id is required" },
        { status: 400 }
      );
    }
    const business = await updateBusiness(String(body.id), body);
    return NextResponse.json({ success: true, data: business });
  } catch (error: any) {
    console.error("Error updating business:", error);
    const statusCode = error.message?.includes("already exists") ? 409 : 500;
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to update business",
      },
      { status: statusCode }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.id) {
      return NextResponse.json(
        { success: false, error: "Business id is required" },
        { status: 400 }
      );
    }
    await deleteBusiness(String(body.id));
    return NextResponse.json({ success: true, data: true });
  } catch (error: any) {
    console.error("Error deleting business:", error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message ?? "Failed to delete business",
      },
      { status: 500 }
    );
  }
}
