import { NextRequest, NextResponse } from "next/server";
import { getLeadConfigsByType, getAllLeadConfigs } from "@/lib/data/lead-config";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    // Get configs by type or all
    const configs = entityType
      ? await getLeadConfigsByType(entityType)
      : await getAllLeadConfigs();

    // Group by entity type
    const groupedConfigs = configs.reduce((acc: any, config) => {
      const type = config.entity_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push({
        id: config.id,
        value: config.entity_value,
        label: config.description || config.entity_value,
        displayOrder: config.display_order,
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
