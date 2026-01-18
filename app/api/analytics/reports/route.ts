import { type NextRequest, NextResponse } from "next/server";
import { getUsers } from "@/lib/data/users";
import { getLeads } from "@/lib/data/leads";
import { getDeals } from "@/lib/data/deals";
import { getTasksPaginated } from "@/lib/data/tasks";
import { getLeadConfigByTypeAndValue } from "@/lib/data/lead-config";
import { supabase } from "@/lib/supabase-client";

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
  // Get all users (or filter by organization if needed)
  const allUsers = await getUsers();

  const performanceData = await Promise.all(
    allUsers.map(async (user) => {
      const userId = user.user_id;

      // Get user leads
      let leadsQuery = supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', userId);
      if (dateFrom) leadsQuery = leadsQuery.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) leadsQuery = leadsQuery.lte('created_at', new Date(dateTo).toISOString());
      const { data: userLeads } = await leadsQuery;

      // Get user deals
      let dealsQuery = supabase
        .from('deals')
        .select('*')
        .eq('user_id', userId);
      if (dateFrom) dealsQuery = dealsQuery.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) dealsQuery = dealsQuery.lte('created_at', new Date(dateTo).toISOString());
      const { data: userDeals } = await dealsQuery;

      // Get completed tasks
      let tasksQuery = supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', userId)
        .eq('status', 'Completed');
      if (dateFrom) tasksQuery = tasksQuery.gte('completed_at', new Date(dateFrom).toISOString());
      if (dateTo) tasksQuery = tasksQuery.lte('completed_at', new Date(dateTo).toISOString());
      const { data: completedTasks } = await tasksQuery;

      // Get qualified status
      const qualifiedStatus = await getLeadConfigByTypeAndValue("status", "qualified");

      const leads = (userLeads || []).map((lead: any) => ({
        status_id: lead.status_id,
        ...lead,
      }));
      const convertedLeads = qualifiedStatus
        ? leads.filter((lead: any) => lead.status_id === qualifiedStatus.id)
        : [];

      const totalDealValue = (userDeals || []).reduce(
        (sum: number, deal: any) => sum + (deal.value || 0),
        0
      );

      return {
        user: `${user.first_name} ${user.last_name}`,
        userId: user.user_id,
        leadsAdded: leads.length,
        leadsConverted: convertedLeads.length,
        conversionRate: leads.length
          ? (convertedLeads.length / leads.length) * 100
          : 0,
        dealValue: totalDealValue,
        tasksCompleted: (completedTasks || []).length,
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
  // Get all leads with source and status configs
  let leadsQuery = supabase
    .from('leads')
    .select(`
      *,
      source_config:leads_config!leads_source_id_fkey(entity_value),
      status_config:leads_config!leads_status_id_fkey(entity_value)
    `);
  
  if (dateFrom) leadsQuery = leadsQuery.gte('created_at', new Date(dateFrom).toISOString());
  if (dateTo) leadsQuery = leadsQuery.lte('created_at', new Date(dateTo).toISOString());
  
  const { data: leads } = await leadsQuery;

  const sourceMap = new Map();

  (leads || []).forEach((lead: any) => {
    const source = lead.source_config?.entity_value || "unknown";
    const status = lead.status_config?.entity_value || "new";

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
    sourceData.totalValue += lead.deal_value || 0;

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
      // Get deals by stage (using stage_id or stage field)
      const { data: stageDeals } = await supabase
        .from('deals')
        .select('*')
        .or(`stage_id.eq.${stageName},stage.eq.${stageName}`);

      const deals = stageDeals || [];

      const totalValue = deals.reduce(
        (sum: number, deal: any) => sum + (deal.value || 0),
        0
      );

      const avgProbability = deals.length
        ? deals.reduce(
            (sum: number, deal: any) => sum + (deal.probability || 0),
            0
          ) / deals.length
        : 0;

      return {
        stage:
          stageName.charAt(0).toUpperCase() +
          stageName.slice(1).replace("_", " "),
        stageId: stageName,
        count: deals.length,
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
  let leadsQuery = supabase
    .from('leads')
    .select(`
      *,
      status_config:leads_config!leads_status_id_fkey(entity_value)
    `);
  
  if (dateFrom) leadsQuery = leadsQuery.gte('created_at', new Date(dateFrom).toISOString());
  if (dateTo) leadsQuery = leadsQuery.lte('created_at', new Date(dateTo).toISOString());
  
  const { data: leads } = await leadsQuery;

  const statusCounts = {
    new: 0,
    contact_attempted: 0,
    in_conversation: 0,
    qualified: 0,
    disqualified: 0,
  };

  (leads || []).forEach((lead: any) => {
    const status = lead.status_config?.entity_value || "new";
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status as keyof typeof statusCounts]++;
    }
  });

  const funnelData = Object.entries(statusCounts).map(([status, count]) => ({
    stage: status.charAt(0).toUpperCase() + status.slice(1).replace("_", " "),
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
