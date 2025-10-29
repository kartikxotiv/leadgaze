import { NextRequest, NextResponse } from "next/server";
import { Lead, LeadConfig } from "@/models";
import { Op } from "sequelize";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    const firstName = (searchParams.get("firstName") || "").trim();
    const lastName = (searchParams.get("lastName") || "").trim();
    const businessName = (searchParams.get("businessName") || "").trim();
    const phone = (searchParams.get("phone") || "").trim();
    const workspaceId = (searchParams.get("workspaceId") || "").trim();

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "organizationId is required" },
        { status: 400 }
      );
    }

    const orClauses: any[] = [];

    if (email) {
      orClauses.push({ email: email });
    }

    if (phone) {
      orClauses.push({ phone: { [Op.iLike]: phone } });
    }

    if (firstName && lastName && businessName) {
      orClauses.push({
        [Op.and]: [
          { firstName: { [Op.iLike]: firstName } },
          { lastName: { [Op.iLike]: lastName } },
          { businessName: { [Op.iLike]: businessName } },
        ],
      });
    }

    if (orClauses.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const whereClause: any = {
      organizationId,
      [Op.or]: orClauses,
    };

   
    if (workspaceId) {
      whereClause.metaData = { [Op.contains]: { workspaceId } } as any;
    }

    const duplicates = await Lead.findAll({
      where: whereClause,
      include: [
        { model: LeadConfig, as: "status", attributes: ["entityValue"] },
        { model: LeadConfig, as: "source", attributes: ["entityValue"] },
      ],
      limit: 25,
    });

    return NextResponse.json({ success: true, data: duplicates });
  } catch (error) {
    console.error("Error detecting lead duplicates:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to detect lead duplicates",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
