import { ApiError } from '../../../utils/response-handler';
import {
  type SupabaseAdminClient,
  getHrmsClient,
  requireEmployeePermission,
} from '../employees/controller.helpers';

type LeaveEmployee = {
  department_id: string | null;
  employee_code: string;
  first_name: string;
  id: string;
  last_name: string | null;
  manager_employee_id: string | null;
};

type LeavePermissions = {
  canApply: boolean;
  canApprove: boolean;
  canManageHolidays: boolean;
  canManageLeaveTypes: boolean;
  canManageConfiguration: boolean;
  canViewApprovals: boolean;
  canViewHolidays: boolean;
  canViewRequests: boolean;
  canViewReports: boolean;
  isAdmin: boolean;
  isHr: boolean;
  isManager: boolean;
  isMember: boolean;
};

type LeaveContext = {
  employee: LeaveEmployee | null;
  organizationId: string;
  permissions: LeavePermissions;
  roleKeys: string[];
  userId: string;
  workspaceId: string;
};

type PermissionProbe = {
  featureKey: string;
  minAccessLevel?: 'all' | 'own' | 'team';
};

async function canAccess(params: {
  featureKey: string;
  minAccessLevel?: 'all' | 'own' | 'team';
  supabaseAdmin: SupabaseAdminClient;
  userId: string;
  workspaceId: string;
}) {
  try {
    await requireEmployeePermission({
      featureKey: params.featureKey,
      minAccessLevel: params.minAccessLevel,
      moduleKey: 'hrms_leave',
      supabaseAdmin: params.supabaseAdmin,
      userId: params.userId,
      workspaceId: params.workspaceId,
    });

    return true;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403) {
      return false;
    }

    throw error;
  }
}

async function canAny(params: {
  permissions: PermissionProbe[];
  supabaseAdmin: SupabaseAdminClient;
  userId: string;
  workspaceId: string;
}) {
  for (const permission of params.permissions) {
    if (
      await canAccess({
        featureKey: permission.featureKey,
        minAccessLevel: permission.minAccessLevel,
        supabaseAdmin: params.supabaseAdmin,
        userId: params.userId,
        workspaceId: params.workspaceId,
      })
    ) {
      return true;
    }
  }

  return false;
}

async function getLeaveContext(params: {
  accountId: string;
  supabaseAdmin: SupabaseAdminClient;
  workspaceId: string;
}) {
  const hrms = getHrmsClient(params.supabaseAdmin);
  const [{ data: employee, error: employeeError }, { data: member }] =
    await Promise.all([
      hrms
        .from('employees')
        .select(
          'id, first_name, last_name, employee_code, department_id, manager_employee_id',
        )
        .eq('workspace_id', params.workspaceId)
        .eq('account_id', params.accountId)
        .eq('is_deleted', false)
        .maybeSingle(),
      params.supabaseAdmin
        .from('workspace_members')
        .select('role:workspace_roles!workspace_members_role_id_fkey(role_key)')
        .eq('workspace_id', params.workspaceId)
        .eq('user_id', params.accountId)
        .eq('status', 'accepted')
        .maybeSingle(),
    ]);

  if (employeeError) {
    throw new ApiError(employeeError.message, 400);
  }

  const roleKey = (member as { role?: { role_key?: string } } | null)?.role
    ?.role_key;
  const roleKeys = roleKey ? [roleKey] : [];
  const isAdmin = roleKeys.includes('admin');
  const isHr = roleKeys.includes('hr');
  const isManager = roleKeys.includes('manager');
  const isMember = roleKeys.includes('user') || roleKeys.includes('member');

  const [
    canApply,
    canApprove,
    canViewApprovals,
    canManageHolidays,
    canManageLeaveTypes,
    canViewHolidays,
    canViewRequests,
    canViewReports,
  ] = await Promise.all([
    canAny({
      permissions: [{ featureKey: 'create', minAccessLevel: 'own' }],
      supabaseAdmin: params.supabaseAdmin,
      userId: params.accountId,
      workspaceId: params.workspaceId,
    }),
    canAny({
      permissions: [{ featureKey: 'approve', minAccessLevel: 'team' }],
      supabaseAdmin: params.supabaseAdmin,
      userId: params.accountId,
      workspaceId: params.workspaceId,
    }),
    canAny({
      permissions: [
        { featureKey: 'view_approvals', minAccessLevel: 'team' },
        { featureKey: 'approve', minAccessLevel: 'team' },
      ],
      supabaseAdmin: params.supabaseAdmin,
      userId: params.accountId,
      workspaceId: params.workspaceId,
    }),
    canAny({
      permissions: [{ featureKey: 'manage_holidays', minAccessLevel: 'team' }],
      supabaseAdmin: params.supabaseAdmin,
      userId: params.accountId,
      workspaceId: params.workspaceId,
    }),
    canAny({
      permissions: [{ featureKey: 'manage_types', minAccessLevel: 'team' }],
      supabaseAdmin: params.supabaseAdmin,
      userId: params.accountId,
      workspaceId: params.workspaceId,
    }),
    canAny({
      permissions: [
        { featureKey: 'view_holidays', minAccessLevel: 'own' },
        { featureKey: 'view', minAccessLevel: 'own' },
      ],
      supabaseAdmin: params.supabaseAdmin,
      userId: params.accountId,
      workspaceId: params.workspaceId,
    }),
    canAny({
      permissions: [
        { featureKey: 'view_requests', minAccessLevel: 'own' },
        { featureKey: 'view', minAccessLevel: 'own' },
      ],
      supabaseAdmin: params.supabaseAdmin,
      userId: params.accountId,
      workspaceId: params.workspaceId,
    }),
    canAny({
      permissions: [{ featureKey: 'view_reports', minAccessLevel: 'team' }],
      supabaseAdmin: params.supabaseAdmin,
      userId: params.accountId,
      workspaceId: params.workspaceId,
    }),
  ]);

  return {
    employee: (employee as LeaveEmployee | null) ?? null,
    organizationId: params.workspaceId,
    permissions: {
      canApply: Boolean(employee) && !isAdmin && canApply,
      canApprove,
      canManageHolidays,
      canManageLeaveTypes,
      canManageConfiguration: canManageHolidays || canManageLeaveTypes,
      canViewApprovals,
      canViewHolidays,
      canViewRequests: Boolean(employee) && canViewRequests,
      canViewReports,
      isAdmin,
      isHr,
      isManager,
      isMember,
    },
    roleKeys,
    userId: params.accountId,
    workspaceId: params.workspaceId,
  } satisfies LeaveContext;
}

function normalizeNullableText(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0 ? normalized : null;
}

function normalizeLeaveTypeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
}

function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function getCalendarYear(value: string) {
  return parseDateOnly(value).getUTCFullYear();
}

function ensureSameCalendarYear(fromDate: string, toDate: string) {
  if (getCalendarYear(fromDate) !== getCalendarYear(toDate)) {
    throw new ApiError(
      'Leave requests must start and end within the same calendar year',
      400,
    );
  }
}

function diffDaysInclusive(fromDate: string, toDate: string) {
  const start = parseDateOnly(fromDate).getTime();
  const end = parseDateOnly(toDate).getTime();

  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    throw new ApiError('Invalid leave date range', 400);
  }

  return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

async function getHolidayCountInRange(params: {
  fromDate: string;
  organizationId: string;
  supabaseAdmin: SupabaseAdminClient;
  toDate: string;
}) {
  const { count, error } = await getHrmsClient(params.supabaseAdmin)
    .from('leave_holidays')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', params.organizationId)
    .gte('holiday_date', params.fromDate)
    .lte('holiday_date', params.toDate);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return count ?? 0;
}

async function computeLeaveDayCount(params: {
  fromDate: string;
  organizationId: string;
  supabaseAdmin: SupabaseAdminClient;
  toDate: string;
}) {
  ensureSameCalendarYear(params.fromDate, params.toDate);

  const totalDays = diffDaysInclusive(params.fromDate, params.toDate);
  const holidayCount = await getHolidayCountInRange(params);
  const dayCount = Math.max(totalDays - holidayCount, 0);

  if (dayCount <= 0) {
    throw new ApiError(
      'Selected dates only contain organization holidays. Choose working days for leave.',
      400,
    );
  }

  return dayCount;
}

function getEmployeeName(employee?: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  if (!employee?.first_name) {
    return 'Unknown Employee';
  }

  return `${employee.first_name}${employee.last_name ? ` ${employee.last_name}` : ''}`;
}

export type { LeaveContext, LeaveEmployee, SupabaseAdminClient };
export {
  computeLeaveDayCount,
  ensureSameCalendarYear,
  getCalendarYear,
  getEmployeeName,
  getLeaveContext,
  normalizeLeaveTypeCode,
  normalizeNullableText,
  parseDateOnly,
};
