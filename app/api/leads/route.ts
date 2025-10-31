import { NextRequest, NextResponse } from "next/server";
import { getLeadsPaginated, createLead, findLeadByEmail } from "@/lib/data/leads";
import { getLeadConfigByTypeAndValue } from "@/lib/data/lead-config";
import { createActivity } from "@/lib/data/activities";
import { LeadScoringEngine } from "@/lib/lead-scoring-engine";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const assignedTo = searchParams.get("assignedTo");
    const workspaceId = searchParams.get("workspaceId");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("limit") || "20");
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

   
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    try {
      const decoded: any = jwt.verify(authHeader.substring(7), JWT_SECRET);
      const hasOrgAccess = Array.isArray(decoded?.availableOrganizations)
        ? decoded.availableOrganizations.some(
            (o: any) => o.id === organizationId
          )
        : decoded?.currentOrganizationId === organizationId;
      if (!hasOrgAccess) {
        return NextResponse.json(
          { success: false, error: "Access denied to this organization" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 }
      );
    }

   
    // Build filters object
    const filters: Record<string, any> = {};

    if (status) {
      const statusConfig = await getLeadConfigByTypeAndValue("status", status);
      if (statusConfig) {
        filters.status_id = statusConfig.id;
      }
    }

    if (source) {
      const sourceConfig = await getLeadConfigByTypeAndValue("source", source);
      if (sourceConfig) {
        filters.source_id = sourceConfig.id;
      }
    }

    if (assignedTo) {
      filters.assigned_to = assignedTo;
    }

    // Note: workspaceId metadata filtering would need custom query
    // For now, we'll skip it or add it later if needed

    const result = await getLeadsPaginated(
      organizationId,
      page,
      limit,
      Object.keys(filters).length > 0 ? filters : undefined,
      search || undefined
    );

    // Transform snake_case to camelCase for frontend
    const transformedLeads = (result.data || []).map((lead: any) => ({
      leadId: lead.lead_id,
      firstName: lead.first_name || '',
      lastName: lead.last_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      businessName: lead.business_name || '',
      companyWebsite: lead.company_website || '',
      jobTitle: lead.job_title || '',
      linkedinProfile: lead.linkedin_profile || '',
      statusId: lead.status_id || '',
      sourceId: lead.source_id || '',
      industryId: lead.industry_id || '',
      companySizeId: lead.company_size_id || '',
      scoreGradeId: lead.score_grade_id || '',
      productInterest: lead.product_interest || '',
      tags: lead.tags || [],
      qualificationNotes: lead.qualification_notes || '',
      assignedTo: lead.assigned_to || '',
      createdBy: lead.created_by || '',
      organizationId: lead.organization_id || '',
      leadScore: lead.lead_score || 0,
      createdAt: lead.created_at || '',
      updatedAt: lead.updated_at || '',
      // Include related data
      status: lead.status,
      sourceConfig: lead.source_config,
      industry: lead.industry,
      companySize: lead.company_size,
      scoreGrade: lead.score_grade,
      assignedUser: lead.assigned_user,
      createdUser: lead.created_user,
      scoreData: lead.score_data,
    }));

    return NextResponse.json({
      success: true,
      data: {
        leads: transformedLeads,
        pagination: {
          total: result.count,
          limit,
          offset,
          page,
          pageSize,
          totalPages: result.totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch leads",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
   
    let requesterUserId: string | undefined;
    let canEditAllData = false;
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        requesterUserId = decoded?.userId;
       
        canEditAllData = Boolean(
          decoded?.availableOrganizations?.find(
            (o: any) => o.id === body.organizationId
          )?.permissions?.can_edit_all_data ||
            decoded?.permissions?.can_edit_all_data
        );
      } catch {
       
        return NextResponse.json(
          { success: false, error: "Invalid or expired token" },
          { status: 401 }
        );
      }
    }

    if (!requesterUserId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

   
    const requiredFields = [
      "firstName",
      "lastName",
      "organizationId",
      "sourceId",
      "createdBy",
    ];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate source config
    const { getLeadConfigById } = await import("@/lib/data/lead-config");
    const sourceConfig = body.sourceId ? await getLeadConfigById(body.sourceId) : null;
    if (!sourceConfig || !sourceConfig.is_active) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or inactive source configuration",
        },
        { status: 400 }
      );
    }

    // Validate industry config if provided
    if (body.industryId) {
      const industryConfig = await getLeadConfigById(body.industryId);
      if (!industryConfig || !industryConfig.is_active) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid or inactive industry configuration",
          },
          { status: 400 }
        );
      }
    }

    // Validate company size config if provided
    if (body.companySizeId) {
      const companySizeConfig = await getLeadConfigById(body.companySizeId);
      if (!companySizeConfig || !companySizeConfig.is_active) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid or inactive company size configuration",
          },
          { status: 400 }
        );
      }
    }

    // Check for duplicate email
    if (body.email) {
      const existingLead = await findLeadByEmail(
        body.email.toLowerCase(),
        body.organizationId
      );

      if (existingLead) {
        return NextResponse.json(
          {
            success: false,
            error: "Lead with this email already exists in your organization",
          },
          { status: 409 }
        );
      }
    }

    // Get default status if not provided
    let statusId = body.statusId;
    if (!statusId) {
      const defaultStatus = await getLeadConfigByTypeAndValue("status", "new");
      if (!defaultStatus) {
        return NextResponse.json(
          {
            success: false,
            error: "Default 'new' status not found in configuration",
          },
          { status: 500 }
        );
      }
      statusId = defaultStatus.id;
    }

    console.log("Creating lead with data:", {
      firstName: body.firstName,
      lastName: body.lastName,
      businessName: body.businessName,
      organizationId: body.organizationId,
      sourceId: body.sourceId,
      createdBy: body.createdBy,
    });

    // Create lead
    const lead = await createLead({
      first_name: body.firstName,
      last_name: body.lastName,
      email: body.email?.toLowerCase(),
      phone: body.phone,
      business_name: body.businessName || body.company || "Unknown Company",
      company_website: body.companyWebsite,
      job_title: body.jobTitle,
      linkedin_profile: body.linkedinProfile,
      organization_id: body.organizationId,
      source_id: body.sourceId,
      industry_id: body.industryId,
      company_size_id: body.companySizeId,
      product_interest: body.productInterest,
      tags: body.tags || null,
      status_id: statusId,
      assigned_to: body.assignedTo,
      created_by: body.createdBy,
      qualification_notes: body.qualificationNotes || body.notes,
      lead_score: 0,
    });

    // Log activity
    try {
      await createActivity({
        activity_type: "lead_created",
        related_type: "lead",
        related_id: lead.lead_id,
        subject: `Lead created by user ${requesterUserId.slice(0, 8)}`,
        user_id: requesterUserId,
        description: body?.qualificationNotes || null,
        metadata: { sourceId: body.sourceId } as any,
      });
    } catch (e) {
      console.error("Failed to log lead_created activity", e);
    }

    // Calculate lead score
    try {
      await LeadScoringEngine.calculateLeadScore(
        lead.lead_id,
        body.organizationId
      );
      console.log(`✅ Lead score calculated for lead: ${lead.lead_id}`);
    } catch (scoringError) {
      console.error("Error calculating lead score:", scoringError);
    }

    const createdLead = lead;

    return NextResponse.json({
      success: true,
      data: createdLead,
      message: "Lead created successfully",
    });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create lead",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : "No stack trace",
      },
      { status: 500 }
    );
  }
}
