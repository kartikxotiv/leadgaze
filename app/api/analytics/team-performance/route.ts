import { type NextRequest, NextResponse } from "next/server";
import { getOrganizationUsers } from "@/lib/data/user-organizations";
import { getUserById } from "@/lib/data/users";
import { getRoleById } from "@/lib/data/organization-roles";
import { getLeadsPaginated } from "@/lib/data/leads";
import { getDealsPaginated } from "@/lib/data/deals";
import { supabase } from "@/lib/supabase-client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Get organization users
    const userOrganizations = await getOrganizationUsers(organizationId);
    const teamPerformance = [];

    for (const userOrg of userOrganizations) {
      const userId = userOrg.user_id;
      const user = await getUserById(userId);
      const role = await getRoleById(userOrg.role_id);

      if (!user) continue;

      // Get leads assigned
      const assignedLeadsResult = await getLeadsPaginated(
        organizationId,
        1,
        1,
        { assigned_to: userId }
      );
      let leadsCount = assignedLeadsResult.total;
      
      // Apply date filter if provided
      if (dateFrom || dateTo) {
        const { count } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('assigned_to', userId)
          .gte('created_at', dateFrom ? new Date(dateFrom).toISOString() : '1900-01-01')
          .lte('created_at', dateTo ? new Date(dateTo).toISOString() : '2100-12-31');
        leadsCount = count || 0;
      }

      // Get leads created
      let leadsCreated = 0;
      const createdLeadsQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('created_by', userId);
      if (dateFrom) createdLeadsQuery.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) createdLeadsQuery.lte('created_at', new Date(dateTo).toISOString());
      const { count: createdCount } = await createdLeadsQuery;
      leadsCreated = createdCount || 0;

      // Get deals
      const dealsFilters: any = { user_id: userId };
      const dealsResult = await getDealsPaginated(organizationId, 1, 1000, dealsFilters);
      let deals = dealsResult.data;
      
      // Filter by date if needed
      if (dateFrom || dateTo) {
        deals = deals.filter((deal) => {
          const created = new Date(deal.created_at);
          if (dateFrom && created < new Date(dateFrom)) return false;
          if (dateTo && created > new Date(dateTo)) return false;
          return true;
        });
      }

      const dealsCount = deals.length;
      const wonDeals = deals.filter((d: any) => d.stage_id === "closed_won" || (d as any).stage === "closed_won").length;
      const lostDeals = deals.filter((d: any) => d.stage_id === "closed_lost" || (d as any).stage === "closed_lost").length;
      const winRate = wonDeals + lostDeals > 0
        ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100)
        : 0;

      const totalValue = deals.reduce((sum, deal) => {
        const value = typeof deal.value === "string" ? parseFloat(deal.value) : deal.value || 0;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);

      // Get activities count
      let activitiesQuery = supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      if (dateFrom) activitiesQuery = activitiesQuery.gte('created_at', new Date(dateFrom).toISOString());
      if (dateTo) activitiesQuery = activitiesQuery.lte('created_at', new Date(dateTo).toISOString());
      const { count: activitiesCount } = await activitiesQuery;

      teamPerformance.push({
        userId,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        role: role?.role || "viewer",
        stats: {
          leadsAssigned: leadsCount,
          leadsCreated,
          dealsCount,
          wonDeals,
          lostDeals,
          winRate,
          totalValue,
          activitiesCount: activitiesCount || 0,
        },
      });
    }

    // Sort by total value
    teamPerformance.sort((a, b) => (b.stats?.totalValue || 0) - (a.stats?.totalValue || 0));

    return NextResponse.json({
      success: true,
      data: {
        teamPerformance,
        summary: {
          totalUsers: teamPerformance.length,
          totalLeads: teamPerformance.reduce(
            (sum, user) => sum + (user.stats?.leadsAssigned || 0),
            0
          ),
          totalDeals: teamPerformance.reduce(
            (sum, user) => sum + (user.stats?.dealsCount || 0),
            0
          ),
          totalValue: teamPerformance.reduce(
            (sum, user) => sum + (user.stats?.totalValue || 0),
            0
          ),
          totalActivities: teamPerformance.reduce(
            (sum, user) => sum + (user.stats?.activitiesCount || 0),
            0
          ),
        },
        timeframe: {
          from: dateFrom,
          to: dateTo,
        },
      },
    });
  } catch (error) {
    console.error("Team performance analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
