/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import { requirePermission } from '~/lib/server/rbac';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

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

const listReportsDashboardController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const filters = parseReportsFilters(request.url);
  const viewPermission = await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'reports',
    featureKey: 'view',
    minAccessLevel: 'own',
  });

  let canExport = false;
  try {
    await requirePermission({
      accountId: user!.id,
      organizationId,
      moduleKey: 'reports',
      featureKey: 'export',
      minAccessLevel: 'own',
    });
    canExport = true;
  } catch (error) {
    if (!(error instanceof ApiError) || error.statusCode !== 403) {
      throw error;
    }
  }

  const { data: employeeRows, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select(
      'id, first_name, last_name, employee_code, shift_id, status, department:departments!employees_department_id_fkey(id, name, code), shift:shifts!employees_shift_id_fkey(id, name, start_time, end_time, grace_minutes)',
    )
    .eq('organization_id', organizationId)
    .neq('status', 'exited')
    .order('first_name', { ascending: true });

  if (employeeError) {
    throw new ApiError(employeeError.message, 400);
  }

  const accessibleEmployees = getAccessibleEmployees({
    employees: (employeeRows ?? []) as any[],
    accessLevel: viewPermission.permission.accessLevel,
    employeeId: viewPermission.employeeId,
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
    supabaseAdmin
      .from('leave_types')
      .select('id, code, name, annual_allocation, is_active')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
    filteredEmployeeIds.length > 0
      ? supabaseAdmin
          .from('attendance_records')
          .select(
            'employee_id, date, check_in, check_out, status, work_hours, shift_id, shift:shifts!attendance_records_shift_id_fkey(id, name, start_time, end_time, grace_minutes)',
          )
          .eq('organization_id', organizationId)
          .gte('date', filters.from)
          .lte('date', filters.to)
          .in('employee_id', filteredEmployeeIds)
      : Promise.resolve({ data: [], error: null }),
    filteredEmployeeIds.length > 0
      ? supabaseAdmin
          .from('leave_requests')
          .select(
            'employee_id, leave_type_id, from_date, to_date, day_count, status, employee:employees!leave_requests_employee_id_fkey(id, first_name, last_name, employee_code, department:departments!employees_department_id_fkey(id, name, code)), leave_type:leave_types!leave_requests_leave_type_id_fkey(id, name, code, annual_allocation)',
          )
          .eq('organization_id', organizationId)
          .lte('from_date', filters.to)
          .gte('to_date', filters.from)
          .in('employee_id', filteredEmployeeIds)
      : Promise.resolve({ data: [], error: null }),
    (supabaseAdmin as any)
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
      .eq('organization_id', organizationId)
      .lte('period_start', filters.to)
      .gte('period_end', filters.from)
      .order('period_start', { ascending: false }),
    filteredEmployeeIds.length > 0
      ? (supabaseAdmin as any)
          .from('employee_pay_items')
          .select(
            'employee_id, source_type, status, amount, effective_date, payable_in_period_start, payable_in_period_end, employee:employees(id, first_name, last_name, employee_code, department:departments!employees_department_id_fkey(id, name, code)), salary_component:salary_components(id, code, name, type)',
          )
          .eq('organization_id', organizationId)
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
        accessLevel: viewPermission.permission.accessLevel,
        employeeId: viewPermission.employeeId,
      },
    }),
  );
});

export { listReportsDashboardController };
