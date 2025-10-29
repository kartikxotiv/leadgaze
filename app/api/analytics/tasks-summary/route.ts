import { type NextRequest, NextResponse } from "next/server";
import { Task, User, UserOrganization, Lead, Deal } from "@/models";
import { Op } from "sequelize";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");
    const userId = searchParams.get("userId");

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

   
    const orgUsers = await User.findAll({
      include: [
        {
          model: UserOrganization,
          where: { organizationId },
          attributes: [],
        },
      ],
      attributes: ["userId"],
    });

    const userIds = orgUsers.map((user) => user.userId);

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          tasksDueToday: 0,
          tasksDueThisWeek: 0,
          byPriority: {
            Low: 0,
            Medium: 0,
            High: 0,
            Urgent: 0,
          },
          byStatus: {
            Pending: 0,
            "In Progress": 0,
            Completed: 0,
            Cancelled: 0,
          },
        },
      });
    }

   
    let baseWhere: any = {
      assignedTo: { [Op.in]: userIds },
    };

   
    if (userId && userIds.includes(userId)) {
      baseWhere = { assignedTo: userId };
    }

   
    const totalTasks = await Task.count({ where: baseWhere });

   
    const completedTasks = await Task.count({
      where: { ...baseWhere, status: "Completed" },
    });

   
    const pendingTasks = await Task.count({
      where: { ...baseWhere, status: { [Op.ne]: "Completed" } },
    });

   
    const now = new Date();
    const overdueTasks = await Task.count({
      where: {
        ...baseWhere,
        status: { [Op.ne]: "Completed" },
        dueDate: { [Op.lt]: now },
      },
    });

   
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksDueToday = await Task.count({
      where: {
        ...baseWhere,
        status: { [Op.ne]: "Completed" },
        dueDate: {
          [Op.gte]: today,
          [Op.lt]: tomorrow,
        },
      },
    });

   
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const tasksDueThisWeek = await Task.count({
      where: {
        ...baseWhere,
        status: { [Op.ne]: "Completed" },
        dueDate: {
          [Op.gte]: today,
          [Op.lt]: weekEnd,
        },
      },
    });

   
    const priorities = ["Low", "Medium", "High", "Urgent"];
    const byPriority: any = {};

    for (const priority of priorities) {
      byPriority[priority] = await Task.count({
        where: { ...baseWhere, priority },
      });
    }

   
    const statuses = ["Pending", "In Progress", "Completed", "Cancelled"];
    const byStatus: any = {};

    for (const status of statuses) {
      byStatus[status] = await Task.count({
        where: { ...baseWhere, status },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalTasks,
        completedTasks,
        pendingTasks,
        overdueTasks,
        tasksDueToday,
        tasksDueThisWeek,
        byPriority,
        byStatus,
        completionRate:
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Tasks summary analytics error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
