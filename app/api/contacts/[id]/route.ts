import { NextRequest, NextResponse } from "next/server";
import {
  getContactById,
  updateContact,
  deleteContact,
} from "@/lib/data/contacts";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contact = await getContactById(params.id);

    if (!contact) {
      return NextResponse.json(
        { success: false, error: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: contact.id,
        workspaceId: contact.workspace_id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        userId: contact.user_id,
        phoneNumber: contact.phone_number,
        companyId: contact.company_id,
        location: contact.location,
        description: contact.description,
        contactTimeZone: contact.contact_time_zone,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error fetching contact:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch contact" },
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

    const updateData: any = {
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email?.toLowerCase(),
      phone_number: body.phoneNumber,
      location: body.location,
      description: body.description,
      contact_time_zone: body.contactTimeZone,
    };

    // Handle company_id - allow setting to null/undefined to remove it
    if (body.hasOwnProperty('companyId')) {
      updateData.company_id = body.companyId || null;
    }

    const contact = await updateContact(params.id, updateData);

    return NextResponse.json({
      success: true,
      data: {
        id: contact.id,
        workspaceId: contact.workspace_id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        userId: contact.user_id,
        phoneNumber: contact.phone_number,
        companyId: contact.company_id,
        location: contact.location,
        description: contact.description,
        contactTimeZone: contact.contact_time_zone,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at,
      },
    });
  } catch (error: any) {
    console.error("Error updating contact:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await deleteContact(params.id);

    return NextResponse.json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting contact:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete contact" },
      { status: 500 }
    );
  }
}

