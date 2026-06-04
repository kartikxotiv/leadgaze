import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  buildBalances,
  buildReports,
  canViewApprovalQueue,
  decorateRequest,
} from './controller.helpers';
import { getRequiredLeaveContext } from './controller.queries';
import {
  type EmployeeReportRow,
  type LeaveRequestRelationRow,
  type LeaveTypeRow,
  leaveRequestSelect,
} from './controller.types';

const leaveDashboardController = catchAsync(async ({ request, user }) => {
  const context = await getRequiredLeaveContext(user?.id);
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const searchParams = new URL(request.url).searchParams;
  const requestedYear = Number(searchParams.get('year'));
  const year =
    Number.isFinite(requestedYear) && requestedYear > 2000
      ? requestedYear
      : new Date().getFullYear();

  const canReadOwnLeave =
    context.permissions.canViewRequests || context.permissions.canApply;
  const canReadLeaveTypes =
    canReadOwnLeave ||
    context.permissions.canViewApprovals ||
    context.permissions.canViewReports ||
    context.permissions.canManageLeaveTypes;
  const canReadHolidays =
    context.permissions.canViewHolidays ||
    context.permissions.canManageHolidays;
  const canAccessLeaveModule =
    canReadOwnLeave ||
    context.permissions.canViewApprovals ||
    canReadHolidays ||
    context.permissions.canManageLeaveTypes ||
    context.permissions.canViewReports;

  if (!canAccessLeaveModule) {
    throw new ApiError('Forbidden', 403);
  }

  const myRequestsQuery =
    context.employee && canReadOwnLeave
      ? supabaseAdmin
          .from('leave_requests')
          .select(leaveRequestSelect)
          .eq('organization_id', context.organizationId)
          .eq('employee_id', context.employee.id)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null });

  const orgRequestsQuery =
    context.permissions.canViewApprovals || context.permissions.canViewReports
      ? supabaseAdmin
          .from('leave_requests')
          .select(leaveRequestSelect)
          .eq('organization_id', context.organizationId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null });

  const employeesQuery = context.permissions.canViewReports
    ? supabaseAdmin
        .from('employees')
        .select(
          'id, first_name, last_name, employee_code, department:departments!employees_department_id_fkey(id, name, code)',
        )
        .eq('organization_id', context.organizationId)
        .order('first_name', { ascending: true })
    : Promise.resolve({ data: [], error: null });

  const leaveTypesQuery = canReadLeaveTypes
    ? supabaseAdmin
        .from('leave_types')
        .select('*')
        .eq('organization_id', context.organizationId)
        .order('name', { ascending: true })
    : Promise.resolve({ data: [], error: null });

  const holidaysQuery = canReadHolidays
    ? supabaseAdmin
        .from('leave_holidays')
        .select('*')
        .eq('organization_id', context.organizationId)
        .order('holiday_date', { ascending: true })
    : Promise.resolve({ data: [], error: null });

  const [
    { data: leaveTypes, error: leaveTypesError },
    { data: holidays, error: holidaysError },
    { data: myRequests, error: myRequestsError },
    { data: orgRequests, error: orgRequestsError },
    { data: employees, error: employeesError },
  ] = await Promise.all([
    leaveTypesQuery,
    holidaysQuery,
    myRequestsQuery,
    orgRequestsQuery,
    employeesQuery,
  ]);

  if (leaveTypesError) {
    throw new ApiError(leaveTypesError.message, 400);
  }

  if (holidaysError) {
    throw new ApiError(holidaysError.message, 400);
  }

  if (myRequestsError) {
    throw new ApiError(myRequestsError.message, 400);
  }

  if (orgRequestsError) {
    throw new ApiError(orgRequestsError.message, 400);
  }

  if (employeesError) {
    throw new ApiError(employeesError.message, 400);
  }

  const typedLeaveTypes = (leaveTypes ?? []) as LeaveTypeRow[];
  const typedMyRequests = ((myRequests ?? []) as LeaveRequestRelationRow[]).map(
    (item) => decorateRequest(context, item),
  );
  const typedOrgRequests = (orgRequests ?? []) as LeaveRequestRelationRow[];

  const approvalRequests = typedOrgRequests
    .filter((item) => canViewApprovalQueue(context, item))
    .map((item) => decorateRequest(context, item));

  const balances =
    context.employee && canReadOwnLeave
      ? buildBalances({
          leaveTypes: typedLeaveTypes,
          requests: (myRequests ?? []) as LeaveRequestRelationRow[],
          year,
        })
      : [];

  const reports = context.permissions.canViewReports
    ? buildReports({
        employees: (employees ?? []) as EmployeeReportRow[],
        leaveTypes: typedLeaveTypes,
        requests: typedOrgRequests,
        year,
      })
    : null;

  return successDataResponse('Leave dashboard fetched successfully', {
    approvalRequests,
    balances,
    employeeId: context.employee?.id ?? null,
    holidays: holidays ?? [],
    leaveTypes: typedLeaveTypes,
    myRequests: typedMyRequests,
    organizationId: context.organizationId,
    permissions: context.permissions,
    reports,
    roleKeys: context.roleKeys,
    year,
  });
});

export { leaveDashboardController };
