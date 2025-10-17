import { NextRequest, NextResponse } from "next/server";
import { LeadConfig } from "@/models";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    let whereClause: any = {
      isActive: true,
    };

    if (entityType) {
      whereClause.entityType = entityType;
    }

    const configs = await LeadConfig.findAll({
      where: whereClause,
      order: [
        ["entityType", "ASC"],
        ["displayOrder", "ASC"],
        ["entityValue", "ASC"],
      ],
    });

   
    const groupedConfigs = configs.reduce((acc: any, config: any) => {
      const type = config.entityType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        id: config.id,
        value: config.entityValue,
        label: config.description || config.entityValue,
        displayOrder: config.displayOrder,
        metadata: config.metadata,
      });
      return acc;
    }, {});

    return NextResponse.json({
      success: true,
      data: groupedConfigs,
    });
  } catch (error) {
    console.error("Error fetching lead configs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch lead configurations",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
