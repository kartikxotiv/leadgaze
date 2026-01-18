import { type NextRequest, NextResponse } from "next/server";
import { getLeads, getLeadsPaginated } from "@/lib/data/leads";
import { getDeals, getDealsPaginated } from "@/lib/data/deals";
import { getActivitiesPaginated, getActivitiesByRelated } from "@/lib/data/activities";
import { getTasksPaginated } from "@/lib/data/tasks";
import { getLeadConfigByTypeAndValue } from "@/lib/data/lead-config";
import { getOrganizationUsers } from "@/lib/data/user-organizations";
import { supabase } from "@/lib/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const userId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Build filters
    const leadsFilters: Record<string, any> = {};
    if (userId) {
      leadsFilters.assigned_to = userId;
    }

    // Get leads count
    const leadsResult = await getLeadsPaginated(organizationId, 1, 1, 
      Object.keys(leadsFilters).length > 0 ? leadsFilters : undefined
    );
    const totalLeads = leadsResult.total;

    // Get qualified leads
    const qualifiedStatusConfig = await getLeadConfigByTypeAndValue("status", "qualified");
    let qualifiedLeads = 0;
    if (qualifiedStatusConfig) {
      const qualifiedResult = await getLeadsPaginated(organizationId, 1, 1, {
        ...leadsFilters,
        status_id: qualifiedStatusConfig.id,
      });
      qualifiedLeads = qualifiedResult.total;
    }

    // Get deals
    const dealsFilters: Record<string, any> = {};
    if (userId) dealsFilters.user_id = userId;

    // Get all deals for calculations (may need to paginate if large)
    const dealsResult = await getDealsPaginated(
      organizationId,
      1,
      1000, // Large limit to get all deals for analytics
      Object.keys(dealsFilters).length > 0 ? dealsFilters : undefined
    );
    const deals = dealsResult.data;

    const totalDeals = deals.length;
    const totalPipelineValue = deals.reduce((sum, deal) => {
      const value = typeof deal.value === "string" 
        ? parseFloat(deal.value) 
        : deal.value || 0;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    // Stage distribution
    const stageDistribution = deals.reduce((acc: any, deal) => {
      // Get stage name from stage_id if needed
      // For now, assuming stage is stored directly or mapped
      const stage = (deal as any).stage_id || (deal as any).stage || "unknown";
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

   
    const wonDeals = stageDistribution.closed_won || 0;
    const lostDeals = stageDistribution.closed_lost || 0;
    const closedDeals = wonDeals + lostDeals;
    const winRate =
      closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0;

   
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Tasks due today
    let tasksDueToday = 0;
    try {
      const orgUsers = await getOrganizationUsers(organizationId);
      const userIds = orgUsers.map((uo) => uo.user_id);

      if (userIds.length > 0) {
        const todayISO = today.toISOString();
        const tomorrowISO = tomorrow.toISOString();
        
        const { count, error } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .in('assigned_to', userIds)
          .neq('status', 'Completed')
          .gte('due_date', todayISO)
          .lt('due_date', tomorrowISO);

        if (error) throw error;
        tasksDueToday = count || 0;
      }
    } catch (error) {
      console.log("Task count error (will use 0):", error);
      tasksDueToday = 0;
    }

    // Recent activities
    let recentActivities: any[] = [];
    try {
      // Get lead and deal IDs for this org
      const orgLeadsResult = await getLeadsPaginated(organizationId, 1, 1000);
      const orgDealsResult = await getDealsPaginated(organizationId, 1, 1000);

      const leadIds = orgLeadsResult.data.map((lead) => lead.lead_id);
      const dealIds = orgDealsResult.data.map((deal) => deal.deal_id);

      // Fetch recent activities using Supabase query
      let activitiesQuery = supabase
        .from('activities')
        .select('activity_id, activity_type, subject, description, created_at, related_type, related_id')
        .order('created_at', { ascending: false })
        .limit(10);

      // Filter by related IDs
      if (leadIds.length > 0 || dealIds.length > 0) {
        const conditions: string[] = [];
        if (leadIds.length > 0) {
          conditions.push(`and(related_type.eq.lead,related_id.in.(${leadIds.join(',')}))`);
        }
        if (dealIds.length > 0) {
          conditions.push(`and(related_type.eq.deal,related_id.in.(${dealIds.join(',')}))`);
        }
        if (conditions.length > 0) {
          activitiesQuery = activitiesQuery.or(conditions.join(','));
        }
      }

      if (userId) {
        activitiesQuery = activitiesQuery.eq('user_id', userId);
      }

      const { data: activities, error: activitiesError } = await activitiesQuery;
      
      if (activitiesError) throw activitiesError;
      recentActivities = activities || [];
    } catch (error) {
      console.log("Activities fetch error (will use empty array):", error);
      recentActivities = [];
    }

   
    const conversionRate =
      totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

   
    const monthlyTrendData = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
        23,
        59,
        59
      );

      // Count leads for this month
      const { count: monthLeadsCount, error: leadsCountError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (leadsCountError) throw leadsCountError;
      const monthLeads = monthLeadsCount || 0;

      // Get deals for this month
      const { data: monthDealsData, error: dealsError } = await supabase
        .from('deals')
        .select('value')
        .eq('organization_id', organizationId)
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (dealsError) throw dealsError;

      const monthDeals = monthDealsData?.length || 0;
      const monthRevenue = (monthDealsData || []).reduce((sum, deal: any) => {
        const value = typeof deal.value === "string" 
          ? parseFloat(deal.value) 
          : deal.value || 0;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);

      monthlyTrendData.push({
        month: months[date.getMonth()],
        leads: monthLeads,
        deals: monthDeals,
        revenue: monthRevenue,
      });
    }

    const trendData = monthlyTrendData;

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalLeads,
          totalDeals,
          totalPipelineValue,
          winRate,
          tasksDueToday,
          conversionRate,
          won: wonDeals,
          lost: lostDeals,
          byStage: {
            qualification: stageDistribution.qualification || 0,
            proposal: stageDistribution.proposal || 0,
            negotiation: stageDistribution.negotiation || 0,
            decision: stageDistribution.decision || 0,
            closed_won: wonDeals,
            closed_lost: lostDeals,
          },
        },
        recentActivities: recentActivities || [],
        trendData: trendData,
      },
    });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
