import { NextRequest, NextResponse } from "next/server";
import { Deal, Lead, User } from "@/models";
import { Op } from "sequelize";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stage = searchParams.get("stage");
    const userId = searchParams.get("userId");
    const organizationId = searchParams.get("organizationId");
    const workspaceId = searchParams.get("workspaceId");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const whereClause: any = {};

    if (stage) whereClause.stage = stage;
    if (userId) whereClause.userId = userId;
    if (organizationId) whereClause.organizationId = organizationId;

   
    if (workspaceId) {
      whereClause.metadata = { [Op.contains]: { workspaceId } } as any;
    }

    const { count, rows: deals } = await Deal.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["firstName", "lastName", "email"],
        },
        {
          model: Lead,
          as: "lead",
          attributes: [
            "leadId",
            "firstName",
            "lastName",
            "businessName",
            "email",
            "phone",
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: {
        deals,
        pagination: {
          total: count,
          limit,
          offset,
          pages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching deals:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch deals",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

   
    const requiredFields = [
      "leadId",
      "title",
      "value",
      "userId",
      "organizationId",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

   
    const lead = await Lead.findByPk(body.leadId);
    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Lead not found" },
        { status: 404 }
      );
    }

   
    const deal = await Deal.create({
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

   
    const createdDeal = await Deal.findByPk((deal as any).dealId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["firstName", "lastName", "email"],
        },
        {
          model: Lead,
          as: "lead",
          attributes: [
            "leadId",
            "firstName",
            "lastName",
            "businessName",
            "email",
            "phone",
          ],
        },
      ],
    });

    return NextResponse.json({
      success: true,
      data: createdDeal,
      message: "Deal created successfully",
    });
  } catch (error) {
    console.error("Error creating deal:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create deal",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
