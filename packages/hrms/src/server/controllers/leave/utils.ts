import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getRbacSnapshot } from '~/lib/server/rbac';
import type { PermissionAccessLevel, RbacSnapshot } from '~/types/rbac.type';
import { ApiError } from '~/utils/response-handler';

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
};

type SupabaseAdminClient = ReturnType<
  typeof getSupabaseServerAdminClient<Database>
>;

const ACCESS_LEVEL_RANK: Record<PermissionAccessLevel, number> = {
  none: 0,
  own: 1,
  team: 2,
};

function hasPermission(params: {
  featureKey: string;
  minAccessLevel?: PermissionAccessLevel;
  moduleKey?: string;
  snapshot: RbacSnapshot;
}) {
  const roleKeys = params.snapshot.roleKeys ?? [];

  if (roleKeys.includes('admin')) {
    return true;
  }

  const moduleKey = params.moduleKey ?? 'leave';
  const entry = params.snapshot.permissions.find(
    (permission) =>
      permission.module_key === moduleKey &&
      permission.feature_key === params.featureKey &&
      permission.can_access,
  );

  if (!entry) {
    return false;
  }

  const minLevel = params.minAccessLevel ?? 'own';

  return ACCESS_LEVEL_RANK[entry.access_level] >= ACCESS_LEVEL_RANK[minLevel];
}

async function getRoleKeysForAccount(params: {
  accountId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  const { data: ownedOrg, error: ownedOrgError } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('id', params.organizationId)
    .eq('owner_id', params.accountId)
    .maybeSingle();

  if (ownedOrgError) {
    throw new ApiError(ownedOrgError.message, 400);
  }

  if (ownedOrg) {
    return ['admin'];
  }

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('organization_id', params.organizationId)
    .eq('account_id', params.accountId)
    .maybeSingle();

  if (employeeError) {
    throw new ApiError(employeeError.message, 400);
  }

  if (!employee) {
    return [];
  }

  const { data, error } = await supabaseAdmin
    .from('employee_roles')
    .select('role:roles!employee_roles_role_id_fkey(role_key)')
    .eq('organization_id', params.organizationId)
    .eq('employee_id', employee.id);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return (data ?? [])
    .map((entry) => entry.role?.role_key)
    .filter((value): value is string => Boolean(value));
}

async function getEmployeeForAccount(params: {
  accountId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select(
      'id, first_name, last_name, employee_code, department_id, manager_employee_id',
    )
    .eq('organization_id', params.organizationId)
    .eq('account_id', params.accountId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return (data as LeaveEmployee | null) ?? null;
}

async function getLeaveContext(params: {
  accountId: string;
  organizationId: string;
}) {
  const [fallbackRoleKeys, employee, rbacSnapshot] = await Promise.all([
    getRoleKeysForAccount(params),
    getEmployeeForAccount(params),
    getRbacSnapshot(params),
  ]);

  const roleKeys = Array.from(
    new Set([...(fallbackRoleKeys ?? []), ...(rbacSnapshot.roleKeys ?? [])]),
  );
  const isAdmin = roleKeys.includes('admin');
  const isHr = roleKeys.includes('hr');
  const isManager = roleKeys.includes('manager');
  const isMember = roleKeys.includes('member');
  const canApply =
    Boolean(employee) &&
    !isAdmin &&
    hasPermission({
      featureKey: 'create',
      minAccessLevel: 'own',
      snapshot: rbacSnapshot,
    });
  const canApprove =
    hasPermission({
      featureKey: 'approve_requests',
      minAccessLevel: 'team',
      snapshot: rbacSnapshot,
    }) ||
    hasPermission({
      featureKey: 'approve',
      minAccessLevel: 'team',
      snapshot: rbacSnapshot,
    });
  const canViewApprovals =
    canApprove ||
    hasPermission({
      featureKey: 'view_approvals',
      minAccessLevel: 'team',
      snapshot: rbacSnapshot,
    });
  const canManageHolidays = hasPermission({
    featureKey: 'manage_holidays',
    minAccessLevel: 'team',
    snapshot: rbacSnapshot,
  });
  const canManageLeaveTypes = hasPermission({
    featureKey: 'manage_types',
    minAccessLevel: 'team',
    snapshot: rbacSnapshot,
  });
  const canViewHolidays =
    canManageHolidays ||
    hasPermission({
      featureKey: 'view_holidays',
      minAccessLevel: 'own',
      snapshot: rbacSnapshot,
    }) ||
    hasPermission({
      featureKey: 'view',
      minAccessLevel: 'own',
      snapshot: rbacSnapshot,
    });
  const canViewRequests =
    Boolean(employee) &&
    (hasPermission({
      featureKey: 'view_requests',
      minAccessLevel: 'own',
      snapshot: rbacSnapshot,
    }) ||
      hasPermission({
        featureKey: 'view',
        minAccessLevel: 'own',
        snapshot: rbacSnapshot,
      }));
  const canViewReports = hasPermission({
    featureKey: 'view_reports',
    minAccessLevel: 'team',
    snapshot: rbacSnapshot,
  });

  return {
    employee,
    organizationId: params.organizationId,
    permissions: {
      canApply,
      canApprove,
      canManageHolidays,
      canManageLeaveTypes,
      canManageConfiguration: canManageHolidays || canManageLeaveTypes,
      canViewApprovals,
      canViewHolidays,
      canViewRequests,
      canViewReports,
      isAdmin,
      isHr,
      isManager,
      isMember,
    },
    roleKeys,
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
  const { count, error } = await params.supabaseAdmin
    .from('leave_holidays')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', params.organizationId)
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
