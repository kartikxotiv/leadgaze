import { NextRequest, NextResponse } from "next/server";
import {
  getCompanyById,
  updateCompany,
  deleteCompany,
} from "@/lib/data/companies";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = await getCompanyById(params.id);

    if (!company) {
      return NextResponse.json(
        { success: false, error: "Company not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: company.id,
        title: company.title,
        description: company.description,
        location: company.location,
        revenue: company.revenue,
        industry: company.industry,
        closeDate: company.close_date,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch company" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError: any) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid JSON in request body. Please check your JSON format." 
        },
        { status: 400 }
      );
    }

    const company = await updateCompany(params.id, {
      title: body.title,
      description: body.description,
      location: body.location,
      revenue: body.revenue,
      industry: body.industry,
      close_date: body.closeDate,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: company.id,
        title: company.title,
        description: company.description,
        location: company.location,
        revenue: company.revenue,
        industry: company.industry,
        closeDate: company.close_date,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update company" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteCompany(params.id);

    return NextResponse.json({
      success: true,
      message: "Company deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete company" },
      { status: 500 }
    );
  }
}

