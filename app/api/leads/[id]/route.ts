import { NextRequest, NextResponse } from "next/server";
import { getLeadWithRelations, updateLead, deleteLead, findLeadByEmail } from "@/lib/data/leads";
import { createActivity } from "@/lib/data/activities";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await getLeadWithRelations(id);

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: lead,
    });
  } catch (error) {
    console.error("Error fetching lead:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch lead",
        details: error instanceof Error ? error.message : "Unknown error",
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

    const lead = await getLeadWithRelations(id);
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    // Auth check
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
            (o: any) => o.id === lead.organization_id
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

    // Check duplicate email
    if (body.email && body.email !== lead.email) {
      const existingLead = await findLeadByEmail(
        body.email.toLowerCase(),
        lead.organization_id
      );

      if (existingLead && existingLead.lead_id !== id) {
        return NextResponse.json(
          { success: false, error: "Lead with this email already exists" },
          { status: 409 }
        );
      }
    }

    // Convert body fields to snake_case
    const updateData: any = {};
    if (body.firstName) updateData.first_name = body.firstName;
    if (body.lastName) updateData.last_name = body.lastName;
    if (body.email) updateData.email = body.email.toLowerCase();
    if (body.phone) updateData.phone = body.phone;
    if (body.businessName) updateData.business_name = body.businessName;
    if (body.companyWebsite) updateData.company_website = body.companyWebsite;
    if (body.jobTitle) updateData.job_title = body.jobTitle;
    if (body.linkedinProfile) updateData.linkedin_profile = body.linkedinProfile;
    if (body.sourceId) updateData.source_id = body.sourceId;
    if (body.industryId) updateData.industry_id = body.industryId;
    if (body.companySizeId) updateData.company_size_id = body.companySizeId;
    if (body.statusId) updateData.status_id = body.statusId;
    if (body.assignedTo) updateData.assigned_to = body.assignedTo;
    if (body.qualificationNotes) updateData.qualification_notes = body.qualificationNotes;
    if (body.productInterest) updateData.product_interest = body.productInterest;
    if (body.tags) updateData.tags = body.tags;

    const updatedLead = await updateLead(id, updateData);

    // Log activity
    try {
      await createActivity({
        activity_type: "lead_updated",
        related_type: "lead",
        related_id: id,
        subject: `Lead updated by user ${requesterUserId.slice(0, 8)}`,
        user_id: requesterUserId,
        description: body?.qualificationNotes || null,
        metadata: { changedFields: Object.keys(body || {}) } as any,
      });
    } catch (e) {
      console.error("Failed to log lead_updated activity", e);
    }

    // Get updated lead with relations
    const updatedLeadWithRelations = await getLeadWithRelations(id);

    return NextResponse.json({
      success: true,
      data: updatedLeadWithRelations,
      message: "Lead updated successfully",
    });
  } catch (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update lead",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await getLeadWithRelations(id);
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    await deleteLead(id);

    return NextResponse.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete lead",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
