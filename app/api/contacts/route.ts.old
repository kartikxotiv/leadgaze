import { NextRequest, NextResponse } from "next/server";
import {
  getContactsPaginated,
  getContactsByWorkspacePaginated,
  createContact,
  findContactByEmail,
} from "@/lib/data/contacts";
import { supabase } from "@/lib/supabase-client";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const workspaceId = searchParams.get("workspaceId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    let result;
    
    // If companyId is provided, fetch contacts for that company
    if (companyId) {
      result = await getContactsPaginated(
        companyId,
        page,
        limit,
        undefined,
        search || undefined
      );
    } 
    // If workspaceId is provided, fetch all contacts for that workspace
    else if (workspaceId) {
      result = await getContactsByWorkspacePaginated(
        workspaceId,
        page,
        limit,
        undefined,
        search || undefined
      );
    } 
    // Otherwise, return error
    else {
      return NextResponse.json(
        { success: false, error: "Company ID or Workspace ID is required" },
        { status: 400 }
      );
    }

    // Transform snake_case to camelCase and ensure company data is included
    const contacts = result.data || [];
    
    // Collect unique company IDs that need to be fetched
    const companyIdsToFetch = new Set<string>();
    contacts.forEach((contact: any) => {
      if (contact.company_id && !contact.company) {
        companyIdsToFetch.add(contact.company_id);
      }
    });

    // Fetch missing company data in a single query
    const companiesMap = new Map<string, any>();
    if (companyIdsToFetch.size > 0) {
      try {
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('id, title, location')
          .in('id', Array.from(companyIdsToFetch));
        
        if (companiesError) {
          console.error('Error fetching companies:', companiesError);
        } else if (companies) {
          companies.forEach((company: any) => {
            companiesMap.set(company.id, {
              id: company.id,
              title: company.title,
              location: company.location,
            });
          });
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      }
    }

    // Transform contacts with company data
    const transformedContacts = contacts.map((contact: any) => {
      let company = null;
      
      // Use company from join if available
      if (contact.company) {
        company = {
          id: contact.company.id,
          title: contact.company.title,
          location: contact.company.location,
        };
      } 
      // Otherwise, use the manually fetched company data
      else if (contact.company_id && companiesMap.has(contact.company_id)) {
        company = companiesMap.get(contact.company_id);
      }

      return {
        id: contact.id,
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
        company,
      };
    });

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
    const requiredFields = ["firstName"];
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

    // Check for duplicate email if provided (only if companyId is also provided)
    if (body.email && body.companyId) {
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

    // Determine workspace_id: use provided workspaceId, or derive from company
    let workspaceId = body.workspaceId;
    if (!workspaceId && body.companyId) {
      // If workspaceId not provided but companyId is, get workspace_id from company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('workspace_id')
        .eq('id', body.companyId)
        .single();
      
      if (!companyError && company) {
        workspaceId = company.workspace_id;
      }
    }

    // Create contact
    const contact = await createContact({
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email?.toLowerCase(),
      phone_number: body.phoneNumber,
      company_id: body.companyId || null,
      workspace_id: workspaceId || null,
      user_id: userId,
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
        userId: contact.user_id,
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

