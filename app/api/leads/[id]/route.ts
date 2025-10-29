import { NextRequest, NextResponse } from "next/server";
import { Lead, LeadConfig, User, Activity } from "@/models";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lead = await Lead.findByPk(id, {
      include: [
        {
          model: LeadConfig,
          as: "status",
          attributes: ["entityValue", "description"],
        },
        {
          model: LeadConfig,
          as: "sourceConfig",
          attributes: ["entityValue", "description"],
        },
        {
          model: LeadConfig,
          as: "industry",
          attributes: ["entityValue", "description"],
        },
        {
          model: LeadConfig,
          as: "companySize",
          attributes: ["entityValue", "description"],
        },
        {
          model: LeadConfig,
          as: "scoreGrade",
          attributes: ["entityValue", "description", "metadata"],
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["firstName", "lastName", "email"],
        },
        {
          model: User,
          as: "createdUser",
          attributes: ["firstName", "lastName"],
        },
      ],
    });

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

    const lead = await Lead.findByPk(id);
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

   
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
            (o: any) => o.id === (lead as any).organizationId
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

   
    if (body.email && body.email !== (lead as any).email) {
      const existingLead = await Lead.findOne({
        where: {
          email: body.email.toLowerCase(),
          organizationId: (lead as any).organizationId,
          leadId: { [require("sequelize").Op.ne]: id },
        },
      });

      if (existingLead) {
        return NextResponse.json(
          { success: false, error: "Lead with this email already exists" },
          { status: 409 }
        );
      }
    }

   
    await lead.update({
      ...body,
      email: body.email?.toLowerCase(),
    });

   
    const updatedLead = await Lead.findByPk(id, {
      include: [
        {
          model: LeadConfig,
          as: "status",
          attributes: ["entityValue", "description"],
        },
        {
          model: LeadConfig,
          as: "sourceConfig",
          attributes: ["entityValue", "description"],
        },
        {
          model: User,
          as: "assignedUser",
          attributes: ["firstName", "lastName", "email"],
        },
      ],
    });

   
    try {
      await (Activity as any).create({
        activityType: "lead_updated",
        relatedType: "lead",
        relatedId: id,
        subject: `Lead updated by user ${(requesterUserId as string).slice(
          0,
          8
        )}`,
        userId: requesterUserId,
        description: body?.qualificationNotes || null,
        metadata: { changedFields: Object.keys(body || {}) },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (e) {
      console.error("Failed to log lead_updated activity", e);
    }

    return NextResponse.json({
      success: true,
      data: updatedLead,
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
    const lead = await Lead.findByPk(id);
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

    await lead.destroy();

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
