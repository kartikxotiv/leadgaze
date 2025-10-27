import { NextRequest, NextResponse } from "next/server";
import {
  Lead,
  LeadConfig,
  User,
  Organization,
  LeadScore,
  Activity,
} from "@/models";
import { Op } from "sequelize";
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

   
    const whereClause: any = {
      organizationId: organizationId,
    };

   
    if (status) {
      const statusConfig = await LeadConfig.findOne({
        where: { entityType: "status", entityValue: status },
      });
      if (statusConfig) {
        whereClause.statusId = (statusConfig as any).id;
      }
    }

   
    if (workspaceId) {
      whereClause.metaData = { [Op.contains]: { workspaceId } } as any;
    }

    if (source) {
      const sourceConfig = await LeadConfig.findOne({
        where: { entityType: "source", entityValue: source },
      });
      if (sourceConfig) {
        whereClause.sourceId = (sourceConfig as any).id;
      }
    }

    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

   
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { businessName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows: leads } = await Lead.findAndCountAll({
      where: whereClause,
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
        {
          model: LeadScore,
          as: "scoreData",
          attributes: ["totalScore", "tier", "lastCalculated"],
          required: false,
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: limit,
      offset: offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        leads,
        pagination: {
          total: count,
          limit,
          offset,
          page,
          pageSize,
          totalPages: Math.ceil(count / limit),
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

   
    const sourceConfig = await LeadConfig.findByPk(body.sourceId);
    if (!sourceConfig || !(sourceConfig as any).isActive) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or inactive source configuration",
        },
        { status: 400 }
      );
    }

   
    if (body.industryId) {
      const industryConfig = await LeadConfig.findByPk(body.industryId);
      if (!industryConfig || !(industryConfig as any).isActive) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid or inactive industry configuration",
          },
          { status: 400 }
        );
      }
    }

    if (body.companySizeId) {
      const companySizeConfig = await LeadConfig.findByPk(body.companySizeId);
      if (!companySizeConfig || !(companySizeConfig as any).isActive) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid or inactive company size configuration",
          },
          { status: 400 }
        );
      }
    }

   
    if (body.email) {
      const existingLead = await Lead.findOne({
        where: {
          email: body.email.toLowerCase(),
          organizationId: body.organizationId,
        },
      });

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

   
    let statusId = body.statusId;
    if (!statusId) {
      const defaultStatus = await LeadConfig.findOne({
        where: { entityType: "status", entityValue: "new" },
      });
      if (!defaultStatus) {
        return NextResponse.json(
          {
            success: false,
            error: "Default 'new' status not found in configuration",
          },
          { status: 500 }
        );
      }
      statusId = (defaultStatus as any).id;
    }

    console.log("Creating lead with data:", {
      firstName: body.firstName,
      lastName: body.lastName,
      businessName: body.businessName,
      organizationId: body.organizationId,
      sourceId: body.sourceId,
      createdBy: body.createdBy,
    });

    // Get the source enum value from the sourceId
    let sourceEnumValue = "Website"; // default value
    if (body.sourceId) {
      const sourceConfig = await LeadConfig.findByPk(body.sourceId);
      if (sourceConfig) {
        const sourceValue = (sourceConfig as any).entityValue;
        // Map the source value to the enum value
        switch (sourceValue) {
          case "website":
            sourceEnumValue = "Website";
            break;
          case "referral":
            sourceEnumValue = "Referral";
            break;
          case "cold_call":
            sourceEnumValue = "Cold Call";
            break;
          case "linkedin":
            sourceEnumValue = "LinkedIn";
            break;
          case "email":
            sourceEnumValue = "Email";
            break;
          case "trade_show":
            sourceEnumValue = "Trade Show";
            break;
          case "advertisement":
            sourceEnumValue = "Advertisement";
            break;
          default:
            sourceEnumValue = "Website";
        }
      }
    }

    const lead = await Lead.create({
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email?.toLowerCase(),
      phone: body.phone,
      businessName: body.businessName || body.company || "Unknown Company",
      companyWebsite: body.companyWebsite,
      jobTitle: body.jobTitle,
      linkedinProfile: body.linkedinProfile,
      organizationId: body.organizationId,
      sourceId: body.sourceId,
      industryId: body.industryId,
      companySizeId: body.companySizeId,
      productInterest: body.productInterest,
      tags: body.tags || null,
      statusId: statusId,
      assignedTo: body.assignedTo,
      createdBy: body.createdBy,
      qualificationNotes: body.qualificationNotes || body.notes,
      leadScore: 0,
      contactPerson: body.contactPerson || `${body.firstName} ${body.lastName}`,
      source: sourceEnumValue,
    });

   
    try {
      await (Activity as any).create({
        activityType: "lead_created",
        relatedType: "lead",
        relatedId: (lead as any).leadId,
        subject: `Lead created by user ${(requesterUserId as string).slice(
          0,
          8
        )}`,
        userId: requesterUserId,
        description: body?.qualificationNotes || null,
        metadata: { sourceId: body.sourceId },
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } catch (e) {
      console.error("Failed to log lead_created activity", e);
    }

   
    const createdLead = await Lead.findByPk((lead as any).leadId);

   
    try {
      await LeadScoringEngine.calculateLeadScore(
        lead.leadId,
        body.organizationId
      );
      console.log(`✅ Lead score calculated for lead: ${lead.leadId}`);
    } catch (scoringError) {
      console.error("Error calculating lead score:", scoringError);
     
    }

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
