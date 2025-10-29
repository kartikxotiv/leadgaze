import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/lib/auth-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

   
    if (!body.name || !body.userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: name, userId",
        },
        { status: 400 }
      );
    }

   
    const organization = await AuthService.createOrganization(body.userId, {
      name: body.name,
      description: body.description,
      industry_type: body.industryType,
      company_size: body.companySize,
      primary_use_case: body.primaryUseCase,
      current_tool: body.currentTool,
    });

    return NextResponse.json({
      success: true,
      message: "Organization created successfully",
      organization: {
        organizationId: (organization as any).organizationId,
        name: (organization as any).name,
        slug: (organization as any).slug,
        description: (organization as any).description,
        industryType: (organization as any).industryType,
        primaryUseCase: (organization as any).primaryUseCase,
        currentTool: (organization as any).currentTool,
       
        statusId: (organization as any).statusId,
        subscriptionStatusId: (organization as any).subscriptionStatusId,
        planTypeId: (organization as any).planTypeId,
        companySizeConfigId: (organization as any).companySizeConfigId,
       
        status: (organization as any).statusConfig?.entityValue || undefined,
        subscriptionStatus:
          (organization as any).subscriptionStatusConfig?.entityValue ||
          undefined,
        planType:
          (organization as any).planTypeConfig?.entityValue || undefined,
        companySize:
          (organization as any).companySizeConfig?.entityValue || undefined,
        trialStartsAt: (organization as any).trialStartsAt,
        trialEndsAt: (organization as any).trialEndsAt,
      },
    });
  } catch (error) {
    console.error("Organization creation error:", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      return NextResponse.json(
        {
          success: false,
          error: "Organization with this name already exists",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Organization creation failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
