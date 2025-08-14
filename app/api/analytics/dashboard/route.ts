import { type NextRequest, NextResponse } from "next/server";
import { Lead, Deal, Activity, Task, LeadConfig, User } from "@/models";
import { Op } from "sequelize";

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

    // Build base where conditions
    const whereConditions: any = { organizationId };
    const dateFilter: any = {};

    if (userId) {
      whereConditions.assignedTo = userId;
    }

    if (dateFrom) {
      dateFilter[Op.gte] = new Date(dateFrom);
    }
    if (dateTo) {
      dateFilter[Op.lte] = new Date(dateTo);
    }

    // Get leads count and statistics
    const leadsWhereConditions = { ...whereConditions };
    if (Object.keys(dateFilter).length > 0) {
      leadsWhereConditions.createdAt = dateFilter;
    }

    const totalLeads = await Lead.count({
      where: leadsWhereConditions,
    });

    // Get qualified leads count (for conversion rate)
    const qualifiedStatusConfig = await LeadConfig.findOne({
      where: { entityType: "status", entityValue: "qualified" },
    });

    const qualifiedLeads = qualifiedStatusConfig
      ? await Lead.count({
          where: {
            ...leadsWhereConditions,
            statusId: (qualifiedStatusConfig as any).id,
          },
        })
      : 0;

    // Get deals count and statistics
    const dealsWhereConditions: any = { organizationId };
    if (userId) dealsWhereConditions.userId = userId;
    if (Object.keys(dateFilter).length > 0) {
      dealsWhereConditions.createdAt = dateFilter;
    }

    const deals = await Deal.findAll({
      where: dealsWhereConditions,
      attributes: ["dealId", "stage", "value", "createdAt"],
    });

    const totalDeals = deals.length;
    const totalPipelineValue = deals.reduce((sum, deal) => {
      const value =
        typeof (deal as any).value === "string"
          ? parseFloat((deal as any).value)
          : (deal as any).value;
      return sum + (isNaN(value) ? 0 : value);
    }, 0);

    // Calculate stage distribution
    const stageDistribution = deals.reduce((acc: any, deal) => {
      const stage = (deal as any).stage || "unknown";
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {});

    // Calculate win rate
    const wonDeals = stageDistribution.closed_won || 0;
    const lostDeals = stageDistribution.closed_lost || 0;
    const closedDeals = wonDeals + lostDeals;
    const winRate =
      closedDeals > 0 ? Math.round((wonDeals / closedDeals) * 100) : 0;

    // Get tasks due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get tasks due today - using lead/deal relationships to filter by organization
    let tasksDueToday = 0;
    try {
      // Count tasks assigned to users in this organization
      const orgUsers = await User.findAll({
        attributes: ["userId"],
        include: [
          {
            model: require("@/models").UserOrganization,
            where: { organizationId },
            attributes: [],
          },
        ],
      });

      const userIds = orgUsers.map((user) => user.userId);

      if (userIds.length > 0) {
        tasksDueToday = await Task.count({
          where: {
            assignedTo: { [Op.in]: userIds },
            status: { [Op.ne]: "Completed" },
            dueDate: {
              [Op.gte]: today,
              [Op.lt]: tomorrow,
            },
          },
        });
      }
    } catch (error) {
      console.log("Task count error (will use 0):", error);
      tasksDueToday = 0;
    }

    // Get recent activities - filter by organization through related leads/deals
    let recentActivities: any[] = [];
    try {
      // Get leads and deals for this organization
      const orgLeads = await Lead.findAll({
        where: { organizationId },
        attributes: ["leadId"],
      });
      const orgDeals = await Deal.findAll({
        where: { organizationId },
        attributes: ["dealId"],
      });

      const leadIds = orgLeads.map((lead) => lead.leadId);
      const dealIds = orgDeals.map((deal) => (deal as any).dealId);

      const activitiesWhereConditions: any = {
        [Op.or]: [],
      };

      if (leadIds.length > 0) {
        activitiesWhereConditions[Op.or].push({
          relatedType: "lead",
          relatedId: { [Op.in]: leadIds },
        });
      }

      if (dealIds.length > 0) {
        activitiesWhereConditions[Op.or].push({
          relatedType: "deal",
          relatedId: { [Op.in]: dealIds },
        });
      }

      if (userId) {
        activitiesWhereConditions.userId = userId;
      }

      // Only query if we have valid conditions
      if (activitiesWhereConditions[Op.or].length > 0) {
        recentActivities = await Activity.findAll({
          where: activitiesWhereConditions,
          order: [["createdAt", "DESC"]],
          limit: 10,
          attributes: [
            "activityId",
            "activityType",
            "subject",
            "description",
            "createdAt",
            "relatedType",
            "relatedId",
          ],
        });
      }
    } catch (error) {
      console.log("Activities fetch error (will use empty array):", error);
      recentActivities = [];
    }

    // Calculate conversion rate (qualified leads / total leads)
    const conversionRate =
      totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0;

    // Get monthly trend data (last 6 months) with better structure
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

      // Get leads for this month
      const monthLeads = await Lead.count({
        where: {
          organizationId,
          createdAt: {
            [Op.gte]: monthStart,
            [Op.lte]: monthEnd,
          },
        },
      });

      // Get deals for this month
      const monthDealsData = await Deal.findAll({
        where: {
          organizationId,
          createdAt: {
            [Op.gte]: monthStart,
            [Op.lte]: monthEnd,
          },
        },
        attributes: ["value"],
        raw: true,
      });

      const monthDeals = monthDealsData.length;
      const monthRevenue = monthDealsData.reduce((sum, deal: any) => {
        const value =
          typeof (deal as any).value === "string"
            ? parseFloat((deal as any).value)
            : (deal as any).value;
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
        trendData: trendData, // Real 6 months data
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
