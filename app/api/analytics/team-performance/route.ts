import { type NextRequest, NextResponse } from "next/server";
import { Lead, Deal, Activity, User, UserOrganization } from "@/models";
import { Op } from "sequelize";

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

   
    const dateFilter: any = {};
    if (dateFrom) {
      dateFilter[Op.gte] = new Date(dateFrom);
    }
    if (dateTo) {
      dateFilter[Op.lte] = new Date(dateTo);
    }

   
    const orgUsers = await User.findAll({
      include: [
        {
          model: UserOrganization,
          where: { organizationId },
          attributes: ["role"],
        },
      ],
      attributes: ["userId", "firstName", "lastName", "email"],
    });

    const teamPerformance = [];

    for (const user of orgUsers) {
      const userId = user.userId;

     
      const leadsWhereClause: any = {
        organizationId,
        assignedTo: userId,
      };
      if (Object.keys(dateFilter).length > 0) {
        leadsWhereClause.createdAt = dateFilter;
      }

      const leadsCount = await Lead.count({ where: leadsWhereClause });
      const leadsCreated = await Lead.count({
        where: {
          organizationId,
          createdBy: userId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      });

     
      const dealsWhereClause: any = {
        organizationId,
        userId: userId,
      };
      if (Object.keys(dateFilter).length > 0) {
        dealsWhereClause.createdAt = dateFilter;
      }

      const deals = await Deal.findAll({
        where: dealsWhereClause,
        attributes: ["stage", "value"],
      });

      const dealsCount = deals.length;
      const wonDeals = deals.filter(
        (d) => (d as any).stage === "closed_won"
      ).length;
      const lostDeals = deals.filter(
        (d) => (d as any).stage === "closed_lost"
      ).length;
      const winRate =
        wonDeals + lostDeals > 0
          ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100)
          : 0;

      const totalValue = deals.reduce((sum, deal) => {
        const value =
          typeof (deal as any).value === "string"
            ? parseFloat((deal as any).value)
            : (deal as any).value;
        return sum + (isNaN(value) ? 0 : value);
      }, 0);

     
      const activitiesCount = await Activity.count({
        where: {
          userId: userId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
        },
      });

      teamPerformance.push({
        userId,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.UserOrganizations?.[0]?.role || "user",
        stats: {
          leadsAssigned: leadsCount,
          leadsCreated,
          dealsCount,
          wonDeals,
          lostDeals,
          winRate,
          totalValue,
          activitiesCount,
        },
      });
    }

   
    teamPerformance.sort((a, b) => b.stats.totalValue - a.stats.totalValue);

    return NextResponse.json({
      success: true,
      data: {
        teamPerformance,
        summary: {
          totalUsers: teamPerformance.length,
          totalLeads: teamPerformance.reduce(
            (sum, user) => sum + user.stats.leadsAssigned,
            0
          ),
          totalDeals: teamPerformance.reduce(
            (sum, user) => sum + user.stats.dealsCount,
            0
          ),
          totalValue: teamPerformance.reduce(
            (sum, user) => sum + user.stats.totalValue,
            0
          ),
          totalActivities: teamPerformance.reduce(
            (sum, user) => sum + user.stats.activitiesCount,
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
