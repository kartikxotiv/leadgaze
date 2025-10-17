import { type NextRequest, NextResponse } from "next/server";
import { User, Lead, Deal, Task, PipelineStage, LeadConfig } from "@/models";
import { Op } from "sequelize";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get("type") || "overview";
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");

    switch (reportType) {
      case "team_performance":
        return await getTeamPerformanceReport(dateFrom, dateTo);
      case "lead_sources":
        return await getLeadSourcesReport(dateFrom, dateTo);
      case "pipeline_analysis":
        return await getPipelineAnalysisReport();
      case "conversion_funnel":
        return await getConversionFunnelReport(dateFrom, dateTo);
      default:
        return await getOverviewReport(dateFrom, dateTo);
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getTeamPerformanceReport(
  dateFrom?: string | null,
  dateTo?: string | null
) {
  const users = await User.findAll({
    attributes: ["userId", "firstName", "lastName", "email"],
  });

  const performanceData = await Promise.all(
    users.map(async (user) => {
     
      const dateFilter: any = {};
      if (dateFrom) dateFilter[Op.gte] = new Date(dateFrom);
      if (dateTo) dateFilter[Op.lte] = new Date(dateTo);

     
      const userLeads = await Lead.findAll({
        where: {
          assignedTo: (user as any).userId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      });

     
      const userDeals = await Deal.findAll({
        where: {
          userId: (user as any).userId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      });

     
      const completedTasks = await Task.findAll({
        where: {
          assignedTo: (user as any).userId,
          status: "Completed",
          ...(Object.keys(dateFilter).length > 0 && {
            completedAt: dateFilter,
          }),
        },
      });

     
      const qualifiedStatus = await LeadConfig.findOne({
        where: { entityType: "status", entityValue: "qualified" },
      });

      const convertedLeads = qualifiedStatus
        ? userLeads.filter(
            (lead: any) => lead.statusId === (qualifiedStatus as any).id
          )
        : [];

      const totalDealValue = userDeals.reduce(
        (sum: number, deal: any) => sum + (deal.value || 0),
        0
      );

      return {
        user: `${(user as any).firstName} ${(user as any).lastName}`,
        userId: (user as any).userId,
        leadsAdded: userLeads.length,
        leadsConverted: convertedLeads.length,
        conversionRate: userLeads.length
          ? (convertedLeads.length / userLeads.length) * 100
          : 0,
        dealValue: totalDealValue,
        tasksCompleted: completedTasks.length,
      };
    })
  );

  return NextResponse.json({
    data: performanceData,
    success: true,
  });
}

async function getLeadSourcesReport(
  dateFrom?: string | null,
  dateTo?: string | null
) {
 
  const dateFilter: any = {};
  if (dateFrom) dateFilter[Op.gte] = new Date(dateFrom);
  if (dateTo) dateFilter[Op.lte] = new Date(dateTo);

  const leads = await Lead.findAll({
    where: {
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    },
    include: [
      {
        model: LeadConfig,
        as: "sourceConfig",
        attributes: ["entityValue"],
      },
      {
        model: LeadConfig,
        as: "statusConfig",
        attributes: ["entityValue"],
      },
    ],
  });

  const sourceMap = new Map();

  leads.forEach((lead: any) => {
    const source = lead.sourceConfig?.entityValue || "unknown";
    const status = lead.statusConfig?.entityValue || "new";

    if (!sourceMap.has(source)) {
      sourceMap.set(source, {
        source,
        leads: 0,
        converted: 0,
        totalValue: 0,
      });
    }

    const sourceData = sourceMap.get(source);
    sourceData.leads++;
    sourceData.totalValue += lead.dealValue || 0;

    if (status === "qualified") {
      sourceData.converted++;
    }
  });

  const sourceData = Array.from(sourceMap.values()).map((data) => ({
    ...data,
    conversionRate: data.leads > 0 ? (data.converted / data.leads) * 100 : 0,
  }));

  return NextResponse.json({
    data: sourceData,
    success: true,
  });
}

async function getPipelineAnalysisReport() {
 
  const stageNames = [
    "qualification",
    "proposal",
    "negotiation",
    "decision",
    "closed_won",
    "closed_lost",
  ];

  const pipelineData = await Promise.all(
    stageNames.map(async (stageName) => {
      const stageDeals = await Deal.findAll({
        where: { stage: stageName },
      });

      const totalValue = stageDeals.reduce(
        (sum: number, deal: any) => sum + (deal.value || 0),
        0
      );

      const avgProbability = stageDeals.length
        ? stageDeals.reduce(
            (sum: number, deal: any) => sum + (deal.probability || 0),
            0
          ) / stageDeals.length
        : 0;

      return {
        stage:
          stageName.charAt(0).toUpperCase() +
          stageName.slice(1).replace("_", " "),
        stageId: stageName,
        count: stageDeals.length,
        totalValue,
        avgProbability,
      };
    })
  );

  return NextResponse.json({
    data: pipelineData,
    success: true,
  });
}

async function getConversionFunnelReport(
  dateFrom?: string | null,
  dateTo?: string | null
) {
 
  const dateFilter: any = {};
  if (dateFrom) dateFilter[Op.gte] = new Date(dateFrom);
  if (dateTo) dateFilter[Op.lte] = new Date(dateTo);

  const leads = await Lead.findAll({
    where: {
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    },
    include: [
      {
        model: LeadConfig,
        as: "statusConfig",
        attributes: ["entityValue"],
      },
    ],
  });

  const statusCounts = {
    new: 0,
    contact_attempted: 0,
    in_conversation: 0,
    qualified: 0,
    disqualified: 0,
  };

  leads.forEach((lead: any) => {
    const status = lead.statusConfig?.entityValue || "new";
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status as keyof typeof statusCounts]++;
    }
  });

  const funnelData = Object.entries(statusCounts).map(([status, count]) => ({
    stage: status.charAt(0).toUpperCase() + status.slice(1).replace("_", " "),
    count,
    percentage: leads.length ? (count / leads.length) * 100 : 0,
  }));

  return NextResponse.json({
    data: funnelData,
    success: true,
  });
}

async function getOverviewReport(
  dateFrom?: string | null,
  dateTo?: string | null
) {
 
  const [teamPerf, leadSources, pipeline, funnel] = await Promise.all([
    getTeamPerformanceReport(dateFrom, dateTo),
    getLeadSourcesReport(dateFrom, dateTo),
    getPipelineAnalysisReport(),
    getConversionFunnelReport(dateFrom, dateTo),
  ]);

  const teamData = await teamPerf.json();
  const sourceData = await leadSources.json();
  const pipelineData = await pipeline.json();
  const funnelData = await funnel.json();

  return NextResponse.json({
    data: {
      teamPerformance: teamData.data,
      leadSources: sourceData.data,
      pipelineAnalysis: pipelineData.data,
      conversionFunnel: funnelData.data,
    },
    success: true,
  });
}
