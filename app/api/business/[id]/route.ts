import { NextRequest, NextResponse } from "next/server";
import {
  getBusinessById,
  updateBusiness,
  deleteBusiness,
} from "@/lib/data/business";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const business = await getBusinessById(id);
    if (!business) {
      return NextResponse.json(
        { success: false, error: "Business not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: business });
  } catch (error: any) {
    console.error("Error fetching business:", error);
    return NextResponse.json(
      { success: false, error: error?.message ?? "Failed to fetch business" },
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
    const business = await updateBusiness(id, body);
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

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteBusiness(id);
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
