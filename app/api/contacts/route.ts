import { NextRequest, NextResponse } from "next/server";
import {
  getContactsPaginated,
  createContact,
  findContactByEmail,
} from "@/lib/data/contacts";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: "Company ID is required" },
        { status: 400 }
      );
    }

    const result = await getContactsPaginated(
      companyId,
      page,
      limit,
      undefined,
      search || undefined
    );

    // Transform snake_case to camelCase
    const transformedContacts = (result.data || []).map((contact: any) => ({
      id: contact.id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.email,
      phoneNumber: contact.phone_number,
      companyId: contact.company_id,
      location: contact.location,
      description: contact.description,
      contactTimeZone: contact.contact_time_zone,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
      company: contact.company,
    }));

    return NextResponse.json({
      success: true,
      data: {
        contacts: transformedContacts,
        pagination: {
          count: result.count,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch contacts" },
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
    const requiredFields = ["firstName", "companyId"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Check for duplicate email if provided
    if (body.email) {
      const existingContact = await findContactByEmail(
        body.email.toLowerCase(),
        body.companyId
      );

      if (existingContact) {
        return NextResponse.json(
          {
            success: false,
            error: "Contact with this email already exists in this company",
          },
          { status: 409 }
        );
      }
    }

    // Create contact
    const contact = await createContact({
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email?.toLowerCase(),
      phone_number: body.phoneNumber,
      company_id: body.companyId,
      location: body.location,
      description: body.description,
      contact_time_zone: body.contactTimeZone,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: contact.id,
        companyId: contact.company_id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phoneNumber: contact.phone_number,
        location: contact.location,
        description: contact.description,
        contactTimeZone: contact.contact_time_zone,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error creating contact:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create contact" },
      { status: 500 }
    );
  }
}

