import { type NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

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
  const { data: users } = await supabase.from("users").select("*");

  const performanceData = await Promise.all(
    (users || []).map(async (user) => {
      // Get user's leads
      let leadsQuery = supabase
        .from("leads")
        .select("*")
        .eq("assigned_to", user.id);

      if (dateFrom) leadsQuery = leadsQuery.gte("created_at", dateFrom);
      if (dateTo) leadsQuery = leadsQuery.lte("created_at", dateTo);

      const { data: userLeads } = await leadsQuery;

      // Get user's deals
      let dealsQuery = supabase
        .from("deals")
        .select("*")
        .eq("assigned_to", user.id);

      if (dateFrom) dealsQuery = dealsQuery.gte("created_at", dateFrom);
      if (dateTo) dealsQuery = dealsQuery.lte("created_at", dateTo);

      const { data: userDeals } = await dealsQuery;

      // Get completed tasks
      let tasksQuery = supabase
        .from("tasks")
        .select("*")
        .eq("assigned_to", user.id)
        .eq("completed", true);

      if (dateFrom) tasksQuery = tasksQuery.gte("completed_at", dateFrom);
      if (dateTo) tasksQuery = tasksQuery.lte("completed_at", dateTo);

      const { data: completedTasks } = await tasksQuery;

      const convertedLeads =
        userLeads?.filter((lead) => lead.status === "Converted") || [];
      const totalDealValue =
        userDeals?.reduce((sum, deal) => sum + deal.value, 0) || 0;

      return {
        user: user.name,
        userId: user.id,
        leadsAdded: userLeads?.length || 0,
        leadsConverted: convertedLeads.length,
        conversionRate: userLeads?.length
          ? (convertedLeads.length / userLeads.length) * 100
          : 0,
        dealValue: totalDealValue,
        tasksCompleted: completedTasks?.length || 0,
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
  let query = supabase.from("leads").select("source, status, deal_value");

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data: leads } = await query;

  const sourceMap = new Map();

  leads?.forEach((lead) => {
    if (!sourceMap.has(lead.source)) {
      sourceMap.set(lead.source, {
        source: lead.source,
        leads: 0,
        converted: 0,
        totalValue: 0,
      });
    }

    const sourceData = sourceMap.get(lead.source);
    sourceData.leads++;
    sourceData.totalValue += lead.deal_value;

    if (lead.status === "Converted") {
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
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("*")
    .order("position");

  const pipelineData = await Promise.all(
    (stages || []).map(async (stage) => {
      const { data: stageDeals } = await supabase
        .from("deals")
        .select("*")
        .eq("stage_id", stage.id);

      return {
        stage: stage.name,
        stageId: stage.id,
        count: stageDeals?.length || 0,
        totalValue: stageDeals?.reduce((sum, deal) => sum + deal.value, 0) || 0,
        avgProbability: stageDeals?.length
          ? stageDeals.reduce((sum, deal) => sum + deal.probability, 0) /
            stageDeals.length
          : 0,
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
  let query = supabase.from("leads").select("status");

  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo);

  const { data: leads } = await query;

  const statusCounts = {
    New: 0,
    Qualified: 0,
    "In Progress": 0,
    Converted: 0,
    Disqualified: 0,
  };

  leads?.forEach((lead) => {
    if (statusCounts.hasOwnProperty(lead.status)) {
      statusCounts[lead.status as keyof typeof statusCounts]++;
    }
  });

  const funnelData = Object.entries(statusCounts).map(([status, count]) => ({
    stage: status,
    count,
    percentage: leads?.length ? (count / leads.length) * 100 : 0,
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
  // This combines multiple report types for a comprehensive overview
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
