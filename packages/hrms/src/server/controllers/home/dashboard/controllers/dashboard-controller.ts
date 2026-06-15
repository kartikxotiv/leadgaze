/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { HomeDashboardData } from '../../../../../types/home-dashboard.type';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../../utils/response-handler';
import {
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from '../../../employees/controller.helpers';
import { formatDate } from '@kit/shared/utils';

const dashboardModuleKey = 'hrms_employees';

export const getDashboardStatsController = catchAsync(
  async ({ request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);
    const userId = getRouteUserId(user);
    const workspaceId = await getRequiredWorkspaceId({
      request,
      supabaseAdmin,
      userId,
    });

    await requireEmployeePermission({
      featureKey: 'view',
      moduleKey: dashboardModuleKey,
      supabaseAdmin,
      userId,
      workspaceId,
    });

    const today = new Date();
    const todayStr = toDateString(today);
    const last7Days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (6 - index));
      return toDateString(date);
    });

    const [
      totalEmployeesResult,
      activeEmployeesResult,
      presentTodayResult,
      leaveTodayResult,
      pendingLeaveResult,
      departmentsResult,
      employeesByDepartmentResult,
      attendanceTrendResult,
      recentJoinersResult,
      openRecruitmentResult,
      activeCandidatesResult,
      pendingPayrollRunsResult,
      latestPayrollRunResult,
      publishedPayslipsResult,
      openSupportResult,
      urgentSupportResult,
      activeSeparationResult,
    ] = await Promise.all([
      hrms
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId),
      hrms
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'active'),
      hrms
        .from('attendance_records')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('date', todayStr)
        .eq('status', 'present'),
      hrms
        .from('leave_requests')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'approved')
        .lte('from_date', todayStr)
        .gte('to_date', todayStr),
      hrms
        .from('leave_requests')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending'),
      hrms
        .from('departments')
        .select('id, name')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('name', { ascending: true }),
      hrms
        .from('employees')
        .select('department_id')
        .eq('workspace_id', workspaceId)
        .eq('status', 'active'),
      hrms
        .from('attendance_records')
        .select('date, status')
        .eq('workspace_id', workspaceId)
        .eq('status', 'present')
        .gte('date', last7Days[0] as string)
        .lte('date', todayStr),
      hrms
        .from('employees')
        .select(
          'id, first_name, last_name, joining_date, status, department:departments!employees_department_id_fkey(name)',
        )
        .eq('workspace_id', workspaceId)
        .order('joining_date', { ascending: false })
        .limit(5),
      hrms
        .from('recruitment_requisitions')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'open'),
      hrms
        .from('recruitment_candidates')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .not('status', 'in', '(rejected,withdrawn,hired)'),
      hrms
        .from('payroll_runs')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .in('status', ['draft', 'calculating', 'processed']),
      hrms
        .from('payroll_runs')
        .select('id, name, status, period_start, period_end')
        .eq('workspace_id', workspaceId)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle(),
      hrms
        .from('payslips')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId),
      hrms
        .from('hr_requests')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .in('status', ['open', 'in_progress']),
      hrms
        .from('hr_requests')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('priority', 'urgent')
        .in('status', ['open', 'in_progress']),
      hrms
        .from('resignation_requests')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .neq('status', 'RETRACTED'),
    ]);

    const results = [
      ['total employees', totalEmployeesResult],
      ['active employees', activeEmployeesResult],
      ['present today', presentTodayResult],
      ['leave today', leaveTodayResult],
      ['pending leave', pendingLeaveResult],
      ['departments', departmentsResult],
      ['employees by department', employeesByDepartmentResult],
      ['attendance trend', attendanceTrendResult],
      ['recent joiners', recentJoinersResult],
      ['open recruitment', openRecruitmentResult],
      ['active candidates', activeCandidatesResult],
      ['pending payroll runs', pendingPayrollRunsResult],
      ['latest payroll run', latestPayrollRunResult],
      ['published payslips', publishedPayslipsResult],
      ['open support requests', openSupportResult],
      ['urgent support requests', urgentSupportResult],
      ['active separation', activeSeparationResult],
    ] as const;

    for (const [label, result] of results) {
      if (result.error) {
        throw new ApiError(
          `Failed to load HRMS dashboard ${label}: ${getSupabaseErrorMessage(result.error)}`,
          400,
        );
      }
    }

    const totalEmployees = totalEmployeesResult.count ?? 0;
    const activeEmployees = activeEmployeesResult.count ?? 0;
    const presentToday = presentTodayResult.count ?? 0;
    const onLeaveToday = leaveTodayResult.data?.length ?? 0;
    const pendingLeaveRequests = pendingLeaveResult.count ?? 0;
    const openRecruitment = openRecruitmentResult.count ?? 0;
    const activeCandidates = activeCandidatesResult.count ?? 0;
    const pendingPayrollRuns = pendingPayrollRunsResult.count ?? 0;
    const openSupportRequests = openSupportResult.count ?? 0;
    const urgentSupportRequests = urgentSupportResult.count ?? 0;
    const activeSeparation = activeSeparationResult.count ?? 0;
    const publishedPayslips = publishedPayslipsResult.count ?? 0;

    const departmentStats = buildDepartmentStats({
      departments: (departmentsResult.data ?? []) as Array<{
        id: string;
        name: string;
      }>,
      employees: (employeesByDepartmentResult.data ?? []) as Array<{
        department_id: string | null;
      }>,
    });
    const attendanceTrend = buildAttendanceTrend({
      dates: last7Days,
      rows: (attendanceTrendResult.data ?? []) as Array<{ date: string }>,
      totalEmployees: activeEmployees,
    });
    const latestPayrollRun = latestPayrollRunResult.data as {
      name?: string | null;
      period_end?: string | null;
      period_start?: string | null;
      status?: string | null;
    } | null;

    const response: HomeDashboardData = {
      attendanceTrend,
      counts: {
        activeEmployees,
        activeSeparation,
        onLeaveToday,
        openRecruitment,
        openSupportRequests,
        pendingActions: {
          leaveRequests: pendingLeaveRequests,
          payrollRuns: pendingPayrollRuns,
          recruitmentItems: openRecruitment,
          separationItems: activeSeparation,
          supportRequests: openSupportRequests,
        },
        pendingPayrollRuns,
        presentToday,
        totalEmployees,
      },
      departmentStats,
      moduleSignals: [
        {
          hint: 'Employees currently marked active.',
          href: '/home/hrms/employees',
          label: 'Employees',
          status: 'good',
          value: activeEmployees,
        },
        {
          hint: 'People present in today attendance.',
          href: '/home/hrms/attendance',
          label: 'Attendance',
          status: presentToday > 0 ? 'good' : 'neutral',
          value: presentToday,
        },
        {
          hint: 'Leave approvals waiting for action.',
          href: '/home/hrms/leave',
          label: 'Leave',
          status: pendingLeaveRequests > 0 ? 'warning' : 'good',
          value: pendingLeaveRequests,
        },
        {
          hint: 'Open requisitions across hiring.',
          href: '/home/hrms/recruitment',
          label: 'Recruitment',
          status: openRecruitment > 0 ? 'neutral' : 'good',
          value: openRecruitment,
        },
        {
          hint: 'Payroll runs not finalized yet.',
          href: '/home/hrms/payroll',
          label: 'Payroll',
          status: pendingPayrollRuns > 0 ? 'warning' : 'good',
          value: pendingPayrollRuns,
        },
        {
          hint: 'Employee support tickets in progress.',
          href: '/home/hrms/support-system',
          label: 'Support',
          status: openSupportRequests > 0 ? 'warning' : 'good',
          value: openSupportRequests,
        },
      ],
      payroll: {
        latestRunName: latestPayrollRun
          ? (latestPayrollRun.name ??
            formatDateRange(
              latestPayrollRun.period_start,
              latestPayrollRun.period_end,
            ))
          : null,
        pendingRuns: pendingPayrollRuns,
        publishedPayslips,
      },
      recentJoiners: ((recentJoinersResult.data ?? []) as any[]).map(
        mapRecentJoiner,
      ),
      recruitment: {
        activeCandidates,
        openRequisitions: openRecruitment,
      },
      support: {
        openRequests: openSupportRequests,
        urgentRequests: urgentSupportRequests,
      },
    };

    return successDataResponse(
      'HRMS dashboard stats fetched successfully',
      response,
    );
  },
);

function toDateString(date: Date) {
  return date.toISOString().split('T')[0] as string;
}

function buildDepartmentStats(params: {
  departments: Array<{ id: string; name: string }>;
  employees: Array<{ department_id: string | null }>;
}) {
  const counts = new Map<string, number>();

  for (const employee of params.employees) {
    if (employee.department_id) {
      counts.set(
        employee.department_id,
        (counts.get(employee.department_id) ?? 0) + 1,
      );
    }
  }

  return params.departments
    .map((department) => ({
      count: counts.get(department.id) ?? 0,
      name: department.name,
    }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 6);
}

function buildAttendanceTrend(params: {
  dates: string[];
  rows: Array<{ date: string }>;
  totalEmployees: number;
}) {
  const countByDate = new Map<string, number>();

  for (const row of params.rows) {
    countByDate.set(row.date, (countByDate.get(row.date) ?? 0) + 1);
  }

  return params.dates.map((date) => ({
    date,
    label: new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', {
      weekday: 'short',
    }),
    present: countByDate.get(date) ?? 0,
    total: params.totalEmployees,
  }));
}

function mapRecentJoiner(employee: any) {
  const firstName = employee.first_name ?? '';
  const lastName = employee.last_name ?? '';
  const name = `${firstName}${lastName ? ` ${lastName}` : ''}`.trim();
  const department = Array.isArray(employee.department)
    ? employee.department[0]
    : employee.department;

  return {
    initials: `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || 'HR',
    meta: `${department?.name ?? 'No department'} - Joined ${formatDate(employee.joining_date)}`,
    name: name || 'Employee',
    status: employee.status === 'active' ? 'Active' : 'Probation',
  } satisfies HomeDashboardData['recentJoiners'][number];
}



function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  if (!startDate || !endDate) {
    return 'Latest run';
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function getSupabaseErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return 'Unknown Supabase error';
  }

  const supabaseError = error as {
    code?: string;
    details?: string;
    hint?: string;
    message?: string;
  };

  return (
    supabaseError.message ||
    supabaseError.details ||
    supabaseError.hint ||
    supabaseError.code ||
    'Unknown Supabase error'
  );
}
