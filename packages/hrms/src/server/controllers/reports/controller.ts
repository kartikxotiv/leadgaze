/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
} from '../employees/controller.helpers';
import {
  applyEmployeeFilters,
  buildAttendanceReports,
  buildLeaveReports,
  buildOptions,
  buildPayrollReports,
  buildReportsDashboardResponse,
  getAccessibleEmployees,
  parseReportsFilters,
} from './utils';

type AccessLevel = 'none' | 'own' | 'team' | 'all';

const moduleKey = 'hrms_reports';

async function getReportsPermission(params: {
  featureKey: string;
  supabaseAdmin: any;
  userId: string;
  workspaceId: string;
}) {
  const { data: member, error: memberError } = await params.supabaseAdmin
    .from('workspace_members')
    .select('role_id')
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.userId)
    .eq('status', 'accepted')
    .limit(1)
    .maybeSingle();

  if (memberError) {
    throw new ApiError(memberError.message, 400);
  }

  if (!member?.role_id) {
    throw new ApiError('Forbidden', 403);
  }

  const { data: permissions, error: permissionError } =
    await params.supabaseAdmin
      .from('role_permissions')
      .select(
        `
        can_access,
        access_level,
        crm_module_features!module_feature_id(
          feature_key,
          crm_modules!module_id(module_key)
        )
      `,
      )
      .eq('workspace_id', params.workspaceId)
      .eq('role_id', member.role_id);

  if (permissionError) {
    throw new ApiError(permissionError.message, 400);
  }

  const permission =
    (
      permissions as Array<{
        access_level?: AccessLevel | null;
        can_access?: boolean | null;
        crm_module_features?: {
          feature_key?: string | null;
          crm_modules?: {
            module_key?: string | null;
          } | null;
        } | null;
      }> | null
    )?.find(
      (item) =>
        item.crm_module_features?.feature_key === params.featureKey &&
        item.crm_module_features?.crm_modules?.module_key === moduleKey,
    ) ?? null;

  if (!permission?.can_access) {
    throw new ApiError('Forbidden', 403);
  }

  return {
    accessLevel: (permission.access_level ?? 'none') as AccessLevel,
  };
}

async function hasReportsPermission(params: {
  featureKey: string;
  supabaseAdmin: any;
  userId: string;
  workspaceId: string;
}) {
  try {
    await getReportsPermission(params);
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403) {
      return false;
    }

    throw error;
  }
}

const listReportsDashboardController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const userId = getRouteUserId(user);

  if (!userId) {
    throw new ApiError('Unauthorized', 401);
  }

  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });
  const hrms = getHrmsClient(supabaseAdmin);
  const filters = parseReportsFilters(request.url);
  const viewPermission = await getReportsPermission({
    featureKey: 'view',
    supabaseAdmin,
    userId,
    workspaceId,
  });
  const canExport = await hasReportsPermission({
    featureKey: 'export',
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const { data: currentEmployee, error: currentEmployeeError } = await hrms
    .from('employees')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('account_id', userId)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle();

  if (currentEmployeeError) {
    throw new ApiError(currentEmployeeError.message, 400);
  }

  const { data: employeeRows, error: employeeError } = await hrms
    .from('employees')
    .select(
      'id, first_name, last_name, employee_code, shift_id, status, department:departments!employees_department_id_fkey(id, name, code), shift:shifts!employees_shift_id_fkey(id, name, start_time, end_time, grace_minutes)',
    )
    .eq('workspace_id', workspaceId)
    .eq('is_deleted', false)
    .neq('status', 'exited')
    .order('first_name', { ascending: true });

  if (employeeError) {
    throw new ApiError(employeeError.message, 400);
  }

  const accessibleEmployees = getAccessibleEmployees({
    employees: (employeeRows ?? []) as any[],
    accessLevel: viewPermission.accessLevel,
    employeeId: currentEmployee?.id ?? null,
  });
  const filteredEmployees = applyEmployeeFilters({
    employees: accessibleEmployees,
    departmentId: filters.departmentId,
    employeeIds: filters.employeeIds,
    shiftId: filters.shiftId,
  });
  const filteredEmployeeIds = filteredEmployees.map((employee) => employee.id);

  const [
    { data: leaveTypes, error: leaveTypesError },
    { data: attendanceRecords, error: attendanceError },
    { data: leaveRequests, error: leaveRequestsError },
    { data: payrollRuns, error: payrollRunsError },
    { data: payItems, error: payItemsError },
  ] = await Promise.all([
    hrms
      .from('leave_types')
      .select('id, code, name, annual_allocation, is_active')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true }),
    filteredEmployeeIds.length > 0
      ? hrms
          .from('attendance_records')
          .select(
            'employee_id, date, check_in, check_out, status, work_hours, shift_id, shift:shifts!attendance_records_shift_id_fkey(id, name, start_time, end_time, grace_minutes)',
          )
          .eq('workspace_id', workspaceId)
          .gte('date', filters.from)
          .lte('date', filters.to)
          .in('employee_id', filteredEmployeeIds)
      : Promise.resolve({ data: [], error: null }),
    filteredEmployeeIds.length > 0
      ? hrms
          .from('leave_requests')
          .select(
            'employee_id, leave_type_id, from_date, to_date, day_count, status, employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name, employee_code, department:departments!employees_department_id_fkey(id, name, code)), leave_type:leave_types!leave_requests_leave_type_id_fkey(id, name, code, annual_allocation)',
          )
          .eq('workspace_id', workspaceId)
          .lte('from_date', filters.to)
          .gte('to_date', filters.from)
          .in('employee_id', filteredEmployeeIds)
      : Promise.resolve({ data: [], error: null }),
    filteredEmployeeIds.length > 0
      ? hrms
          .from('payroll_runs')
          .select(
            `
            id,
            name,
            period_start,
            period_end,
            status,
            payroll_entries(
              id,
              employee_id,
              status,
              gross_earnings,
              total_deductions,
              employer_contributions,
              net_pay,
              employee:employees(
                id,
                first_name,
                last_name,
                employee_code,
                department:departments!employees_department_id_fkey(id, name, code)
              ),
              payroll_entry_items(
                id,
                amount,
                source,
                is_employer_side,
                salary_component:salary_components(id, code, name, type)
              )
            )
          `,
          )
          .eq('workspace_id', workspaceId)
          .lte('period_start', filters.to)
          .gte('period_end', filters.from)
          .order('period_start', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    filteredEmployeeIds.length > 0
      ? hrms
          .from('employee_pay_items')
          .select(
            'employee_id, source_type, status, amount, effective_date, payable_in_period_start, payable_in_period_end, employee:employees(id, first_name, last_name, employee_code, department:departments!employees_department_id_fkey(id, name, code)), salary_component:salary_components(id, code, name, type)',
          )
          .eq('workspace_id', workspaceId)
          .gte('effective_date', filters.from)
          .lte('effective_date', filters.to)
          .in('employee_id', filteredEmployeeIds)
          .order('effective_date', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (leaveTypesError) {
    throw new ApiError(leaveTypesError.message, 400);
  }

  if (attendanceError) {
    throw new ApiError(attendanceError.message, 400);
  }

  if (leaveRequestsError) {
    throw new ApiError(leaveRequestsError.message, 400);
  }

  if (payrollRunsError) {
    throw new ApiError(payrollRunsError.message, 400);
  }

  if (payItemsError) {
    throw new ApiError(payItemsError.message, 400);
  }

  const filteredPayrollRuns = ((payrollRuns ?? []) as any[]).map((run) => ({
    ...run,
    payroll_entries: (run.payroll_entries ?? []).filter((entry: any) =>
      filteredEmployeeIds.includes(entry.employee_id),
    ),
  }));

  const attendanceReports = buildAttendanceReports({
    employees: filteredEmployees,
    records: (attendanceRecords ?? []) as any[],
    from: filters.from,
    to: filters.to,
  });
  const leaveReports = buildLeaveReports({
    employees: filteredEmployees,
    leaveTypes: (leaveTypes ?? []) as any[],
    requests: (leaveRequests ?? []) as any[],
  });
  const payrollReports = buildPayrollReports({
    payrollRuns: filteredPayrollRuns as any[],
    payItems: (payItems ?? []) as any[],
  });

  return successDataResponse(
    'Reports dashboard fetched successfully',
    buildReportsDashboardResponse({
      attendance: attendanceReports.data,
      attendanceSnapshot: attendanceReports.employeeSnapshot,
      customEmployees: filteredEmployees,
      filters: {
        from: filters.from,
        to: filters.to,
        departmentId: filters.departmentId,
        shiftId: filters.shiftId,
        employeeIds: filteredEmployeeIds,
        appliedEmployeeCount: filteredEmployeeIds.length,
        totalAccessibleEmployees: accessibleEmployees.length,
      },
      leave: leaveReports.data,
      leaveSnapshot: leaveReports.employeeSnapshot,
      options: buildOptions(accessibleEmployees),
      payroll: payrollReports.data,
      payrollSnapshot: payrollReports.employeeSnapshot,
      permissions: {
        canView: true,
        canExport,
        accessLevel: viewPermission.accessLevel,
        employeeId: currentEmployee?.id ?? null,
      },
    }),
  );
});

export { listReportsDashboardController };
