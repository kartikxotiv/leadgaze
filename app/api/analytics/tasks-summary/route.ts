import { type NextRequest, NextResponse } from "next/server";
import { getOrganizationUsers } from "@/lib/data/user-organizations";
import { supabase } from "@/lib/supabase-client";

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

    const orgUsers = await getOrganizationUsers(organizationId);
    const userIds = orgUsers.map((uo) => uo.user_id);

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

    const targetUserIds = userId && userIds.includes(userId) ? [userId] : userIds;

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalTasks: 0,
          completedTasks: 0,
          pendingTasks: 0,
          overdueTasks: 0,
          tasksDueToday: 0,
          tasksDueThisWeek: 0,
          byPriority: { Low: 0, Medium: 0, High: 0, Urgent: 0 },
          byStatus: { Pending: 0, "In Progress": 0, Completed: 0, Cancelled: 0 },
        },
      });
    }

    // Build queries
    let totalTasksQuery = supabase.from('tasks').select('*', { count: 'exact', head: true }).in('assigned_to', targetUserIds);
    let completedTasksQuery = supabase.from('tasks').select('*', { count: 'exact', head: true }).in('assigned_to', targetUserIds).eq('status', 'Completed');
    let pendingTasksQuery = supabase.from('tasks').select('*', { count: 'exact', head: true }).in('assigned_to', targetUserIds).neq('status', 'Completed');

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    let overdueTasksQuery = supabase.from('tasks').select('*', { count: 'exact', head: true })
      .in('assigned_to', targetUserIds)
      .neq('status', 'Completed')
      .lt('due_date', now.toISOString());

    let tasksDueTodayQuery = supabase.from('tasks').select('*', { count: 'exact', head: true })
      .in('assigned_to', targetUserIds)
      .neq('status', 'Completed')
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString());

    let tasksDueThisWeekQuery = supabase.from('tasks').select('*', { count: 'exact', head: true })
      .in('assigned_to', targetUserIds)
      .neq('status', 'Completed')
      .gte('due_date', today.toISOString())
      .lt('due_date', weekEnd.toISOString());

    const [totalResult, completedResult, pendingResult, overdueResult, todayResult, weekResult] = await Promise.all([
      totalTasksQuery,
      completedTasksQuery,
      pendingTasksQuery,
      overdueTasksQuery,
      tasksDueTodayQuery,
      tasksDueThisWeekQuery,
    ]);

    const totalTasks = totalResult.count || 0;
    const completedTasks = completedResult.count || 0;
    const pendingTasks = pendingResult.count || 0;
    const overdueTasks = overdueResult.count || 0;
    const tasksDueToday = todayResult.count || 0;
    const tasksDueThisWeek = weekResult.count || 0;

    // Get priority and status breakdowns
    const priorities = ["Low", "Medium", "High", "Urgent"];
    const byPriority: any = {};
    for (const priority of priorities) {
      const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true })
        .in('assigned_to', targetUserIds)
        .eq('priority', priority);
      byPriority[priority] = count || 0;
    }

    const statuses = ["Pending", "In Progress", "Completed", "Cancelled"];
    const byStatus: any = {};
    for (const status of statuses) {
      const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true })
        .in('assigned_to', targetUserIds)
        .eq('status', status);
      byStatus[status] = count || 0;
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
