/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

export const getDashboardStatsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0] as string;

  // Last 7 days dates
  const last7Days: string[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - i);
    return d.toISOString().split('T')[0] as string;
  }).reverse();

  const [
    { count: totalEmployees, error: employeesError },
    { count: presentToday, error: attendanceError },
    { data: leaveRequests, error: leaveError },
    { data: recentJoiners, error: joinersError },
    { count: pendingLeave, error: pendingLeaveError },
    { data: departments, error: departmentsError },
    { data: employeesByDept, error: ebdError },
    { data: historicalAttendance, error: haError },
  ] = await Promise.all([
    // Total Active Employees
    supabaseAdmin
      .from('employees')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'active'),

    // Present Today
    supabaseAdmin
      .from('attendance_records')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('date', todayStr)
      .eq('status', 'present'),

    // On Leave Today
    supabaseAdmin
      .from('leave_requests')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('status', 'approved')
      .lte('from_date', todayStr)
      .gte('to_date', todayStr),

    // Recent Joiners
    supabaseAdmin
      .from('employees')
      .select(
        'first_name, last_name, joining_date, status, department:departments(name)',
      )
      .eq('organization_id', organizationId)
      .order('joining_date', { ascending: false })
      .limit(5),

    // Pending Leave Requests
    supabaseAdmin
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'pending'),

    // Department Stats
    supabaseAdmin
      .from('departments')
      .select('id, name')
      .eq('organization_id', organizationId)
      .eq('is_active', true),

    supabaseAdmin
      .from('employees')
      .select('department_id')
      .eq('organization_id', organizationId)
      .eq('status', 'active'),

    // Historical Attendance (Last 7 days)
    supabaseAdmin
      .from('attendance_records')
      .select('date, status')
      .eq('organization_id', organizationId)
      .eq('status', 'present')
      .gte('date', last7Days[0] as string)
      .lte('date', todayStr),
  ]);

  if (employeesError) throw new ApiError(employeesError.message, 400);
  if (attendanceError) throw new ApiError(attendanceError.message, 400);
  if (leaveError) throw new ApiError(leaveError.message, 400);
  if (joinersError) throw new ApiError(joinersError.message, 400);
  if (ebdError) throw new ApiError(ebdError.message, 400);
  if (haError) throw new ApiError(haError.message, 400);

  // Group by Dept
  const deptCountMap: Record<string, number> = (employeesByDept ?? []).reduce(
    (acc: any, curr: any) => {
      if (curr.department_id) {
        acc[curr.department_id] = (acc[curr.department_id] || 0) + 1;
      }
      return acc;
    },
    {},
  );

  const departmentStats = (departments ?? [])
    .map((d: any) => ({
      name: d.name,
      count: deptCountMap[d.id] || 0,
    }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5);

  // Group historical attendance
  const attendanceDayMap: Record<string, number> = (
    historicalAttendance ?? []
  ).reduce((acc: any, curr: any) => {
    acc[curr.date] = (acc[curr.date] || 0) + 1;
    return acc;
  }, {});

  const attendanceTrend = last7Days.map((date: string) => ({
    date: new Date(date).toLocaleDateString('en-IN', { weekday: 'short' }),
    present: Number(attendanceDayMap[date] || 0),
    total: Number(totalEmployees ?? 0),
  }));

  return successDataResponse('Dashboard stats fetched successfully', {
    counts: {
      totalEmployees: totalEmployees ?? 0,
      presentToday: presentToday ?? 0,
      onLeaveToday: leaveRequests?.length ?? 0,
      pendingActions: {
        leaveRequests: pendingLeave ?? 0,
      },
    },
    recentJoiners: (recentJoiners ?? []).map((emp: any) => ({
      name: `${emp.first_name} ${emp.last_name || ''}`.trim(),
      initials:
        `${emp.first_name[0]}${(emp.last_name || '')[0] || ''}`.toUpperCase(),
      meta: `${emp.department?.name || 'N/A'} - Joined ${new Date(emp.joining_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}`,
      status: emp.status === 'active' ? 'Active' : 'Probation',
    })),
    attendanceTrend,
    departmentStats,
  });
});
