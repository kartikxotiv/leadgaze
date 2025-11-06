import { NextRequest, NextResponse } from "next/server";
import {
  getCompaniesPaginated,
  createCompany,
} from "@/lib/data/companies";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const workspaceId = searchParams.get("workspaceId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Build filters object
    const filters: Record<string, any> = {};
    if (workspaceId) {
      filters.workspace_id = workspaceId;
    }

    const result = await getCompaniesPaginated(
      page,
      limit,
      Object.keys(filters).length > 0 ? filters : undefined,
      search || undefined
    );

    // Transform snake_case to camelCase
    const transformedCompanies = (result.data || []).map((company: any) => ({
      id: company.id,
      title: company.title,
      description: company.description,
      location: company.location,
      revenue: company.revenue,
      industry: company.industry,
      closeDate: company.close_date,
      userId: company.user_id,
      createdAt: company.created_at,
      updatedAt: company.updated_at,
      contacts: company.contacts,
    }));

    return NextResponse.json({
      success: true,
      data: {
        companies: transformedCompanies,
        pagination: {
          count: result.count,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Validate required fields
    const requiredFields = ["title", "workspaceId"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Verify authorization and extract user_id
    const authHeader = request.headers.get("authorization");
    let userId: string | undefined;
    
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const decoded: any = jwt.verify(authHeader.substring(7), JWT_SECRET);
        userId = decoded?.userId || decoded?.user_id;
        if (userId) {
          console.log("✅ Successfully extracted userId from token:", userId);
        } else {
          console.warn("⚠️ Token decoded but userId not found in payload:", decoded);
        }
      } catch (error) {
        // If token is invalid, continue without user_id (optional auth)
        console.warn("⚠️ Failed to verify/parse token:", error);
      }
    } else {
      console.warn("⚠️ No authorization header found in request");
    }

    // Create company
    const company = await createCompany({
      title: body.title,
      description: body.description,
      location: body.location,
      revenue: body.revenue,
      industry: body.industry,
      close_date: body.closeDate,
      workspace_id: body.workspaceId,
      user_id: userId,
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
        userId: company.user_id,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create company" },
      { status: 500 }
    );
  }
}

