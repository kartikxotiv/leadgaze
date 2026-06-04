import { ApiError } from '../../../utils/response-handler';
import { type EmployeeBody, normalizeNullable } from './utils';

type SupabaseAdminClient = any;
type HrmsClient = any;
type AccessLevel = 'none' | 'own' | 'team' | 'all';

type EmployeeRow = {
  id: string;
  workspace_id: string;
  account_id: string | null;
  department_id: string | null;
  shift_id: string | null;
  manager_employee_id: string | null;
  employee_code: string;
  first_name: string;
  last_name: string | null;
  work_email: string;
  phone: string | null;
  designation: string | null;
  joining_date: string | null;
  employment_type: string;
  status: string;
  invited_at: string | null;
  created_at: string;
  updated_at: string;
};

type EmployeeManager = {
  employee_code: string;
  first_name: string;
  id: string;
  last_name: string | null;
};

type EmployeeOptionEmployee = {
  account_id: string | null;
  employee_code: string;
  first_name: string;
  id: string;
  last_name: string | null;
  status: string;
};

type EmployeeOptionRole = {
  id: string;
  role_key: string;
  role_name: string;
};

type EmployeeRoleAssignment = {
  employee_id: string;
  role_id: string;
};

const accessRank: Record<AccessLevel, number> = {
  none: 0,
  own: 1,
  team: 2,
  all: 3,
};

function getHrmsClient(supabaseAdmin: SupabaseAdminClient) {
  return supabaseAdmin.schema('hrms') as HrmsClient;
}

function getRouteUserId(user: unknown) {
  return (user as { id?: string } | undefined)?.id;
}

async function getRequiredWorkspaceId(params: {
  request?: {
    cookies?: {
      get: (name: string) => { value?: string } | undefined;
    };
  };
  supabaseAdmin: SupabaseAdminClient;
  userId?: string;
}) {
  if (!params.userId) {
    throw new ApiError('Unauthorized', 401);
  }

  const activeWorkspaceId =
    params.request?.cookies?.get('organization_id')?.value;

  if (activeWorkspaceId) {
    const { data: activeMember, error: activeMemberError } =
      await params.supabaseAdmin
        .from('workspace_members')
        .select('workspace_id')
        .eq('workspace_id', activeWorkspaceId)
        .eq('user_id', params.userId)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();

    if (activeMemberError) {
      throw new ApiError(activeMemberError.message, 400);
    }

    if (!activeMember) {
      throw new ApiError('Workspace not found for user', 404);
    }

    return activeWorkspaceId;
  }

  const { data, error } = await params.supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', params.userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data?.workspace_id) {
    throw new ApiError('Workspace not found for user', 404);
  }

  return (data as { workspace_id: string }).workspace_id;
}

async function requireEmployeePermission(params: {
  featureKey: string;
  minAccessLevel?: AccessLevel;
  moduleKey?: string;
  supabaseAdmin: SupabaseAdminClient;
  userId?: string;
  workspaceId: string;
}) {
  if (!params.userId) {
    throw new ApiError('Unauthorized', 401);
  }

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

  const workspaceMember = member as { role_id?: string } | null;

  if (!workspaceMember?.role_id) {
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
      .eq('role_id', workspaceMember.role_id);

  if (permissionError) {
    throw new ApiError(permissionError.message, 400);
  }

  const moduleKey = params.moduleKey ?? 'hrms_employees';
  const featureKeys = getFeatureAliases(moduleKey, params.featureKey);
  const rolePermission =
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
    )?.find((permission) => {
      const feature = permission.crm_module_features;
      const permissionModuleKey = feature?.crm_modules?.module_key;

      return (
        permissionModuleKey === moduleKey &&
        featureKeys.includes(feature?.feature_key ?? '')
      );
    }) ?? null;

  const accessLevel = (rolePermission?.access_level ?? 'none') as AccessLevel;
  const minAccessLevel = params.minAccessLevel ?? 'own';

  if (
    !rolePermission?.can_access ||
    accessRank[accessLevel] < accessRank[minAccessLevel]
  ) {
    throw new ApiError('Forbidden', 403);
  }
}

async function enrichEmployees(params: {
  employees: EmployeeRow[] | null;
  supabaseAdmin: SupabaseAdminClient;
  workspaceId: string;
}) {
  const employees = params.employees ?? [];
  const hrms = getHrmsClient(params.supabaseAdmin);

  const accountIds = uniqueIds(
    employees.map((employee) => employee.account_id),
  );
  const departmentIds = uniqueIds(
    employees.map((employee) => employee.department_id),
  );
  const shiftIds = uniqueIds(employees.map((employee) => employee.shift_id));
  const managerIds = uniqueIds(
    employees.map((employee) => employee.manager_employee_id),
  );
  const employeeIds = uniqueIds(employees.map((employee) => employee.id));

  const [
    accountsResult,
    departmentsResult,
    shiftsResult,
    managersResult,
    rolesResult,
  ] = await Promise.all([
    accountIds.length > 0
      ? params.supabaseAdmin
          .from('accounts')
          .select('id, name, email')
          .in('id', accountIds)
      : Promise.resolve({ data: [], error: null }),
    departmentIds.length > 0
      ? hrms
          .from('departments')
          .select('id, name, code')
          .eq('workspace_id', params.workspaceId)
          .in('id', departmentIds)
      : Promise.resolve({ data: [], error: null }),
    shiftIds.length > 0
      ? hrms
          .from('shifts')
          .select('id, name, start_time, end_time, grace_minutes, is_active')
          .eq('workspace_id', params.workspaceId)
          .in('id', shiftIds)
      : Promise.resolve({ data: [], error: null }),
    managerIds.length > 0
      ? hrms
          .from('employees')
          .select('id, first_name, last_name, employee_code')
          .eq('workspace_id', params.workspaceId)
          .in('id', managerIds)
      : Promise.resolve({ data: [], error: null }),
    employeeIds.length > 0
      ? hrms
          .from('employee_roles')
          .select('employee_id, role_id')
          .eq('workspace_id', params.workspaceId)
          .in('employee_id', employeeIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const result of [
    accountsResult,
    departmentsResult,
    shiftsResult,
    managersResult,
    rolesResult,
  ]) {
    if (result.error) {
      throw new ApiError(result.error.message, 400);
    }
  }

  const accountsById = mapById(
    (accountsResult.data ?? []) as Array<{ id: string }>,
  );
  const departmentsById = mapById(
    (departmentsResult.data ?? []) as Array<{ id: string }>,
  );
  const shiftsById = mapById(
    (shiftsResult.data ?? []) as Array<{ id: string }>,
  );
  const managersById = mapById(
    (managersResult.data ?? []) as EmployeeManager[],
  );
  const roleByEmployeeId = new Map(
    ((rolesResult.data ?? []) as EmployeeRoleAssignment[]).map((role) => [
      role.employee_id,
      role.role_id,
    ]),
  );

  return employees.map((employee) => ({
    ...employee,
    organization_id: employee.workspace_id,
    account: employee.account_id
      ? (accountsById.get(employee.account_id) ?? null)
      : null,
    department: employee.department_id
      ? (departmentsById.get(employee.department_id) ?? null)
      : null,
    manager: employee.manager_employee_id
      ? (managersById.get(employee.manager_employee_id) ?? null)
      : null,
    role_id: roleByEmployeeId.get(employee.id) ?? null,
    shift: employee.shift_id
      ? (shiftsById.get(employee.shift_id) ?? null)
      : null,
  }));
}

function buildEmployeeInsertPayload(params: {
  accountId: string | null;
  employeeBody: EmployeeBody;
  invitedAt: string | null;
  status: string;
  userId?: string;
  workspaceId: string;
}) {
  const { accountId, employeeBody, invitedAt, status, userId, workspaceId } =
    params;

  return {
    account_id: accountId,
    department_id: normalizeNullable(employeeBody.department_id),
    shift_id: normalizeNullable(employeeBody.shift_id),
    designation: normalizeNullable(employeeBody.designation),
    employee_code: employeeBody.employee_code?.trim().toUpperCase() ?? '',
    employment_type: employeeBody.employment_type ?? 'full_time',
    first_name: employeeBody.first_name?.trim() ?? '',
    invited_at: invitedAt,
    invited_by: userId,
    joining_date: employeeBody.joining_date ?? null,
    last_name: normalizeNullable(employeeBody.last_name),
    manager_employee_id: normalizeNullable(employeeBody.manager_employee_id),
    phone: normalizeNullable(employeeBody.phone),
    status,
    work_email: employeeBody.work_email?.trim().toLowerCase() ?? '',
    workspace_id: workspaceId,
    created_by: userId,
    updated_by: userId,
  };
}

function buildEmployeeUpdatePayload(params: {
  employeeBody: EmployeeBody;
  nextWorkEmail: string;
  userId?: string;
}) {
  const { employeeBody, nextWorkEmail, userId } = params;

  return {
    account_id: employeeBody.account_id,
    department_id:
      employeeBody.department_id === undefined
        ? undefined
        : normalizeNullable(employeeBody.department_id),
    shift_id:
      employeeBody.shift_id === undefined
        ? undefined
        : normalizeNullable(employeeBody.shift_id),
    designation:
      employeeBody.designation === undefined
        ? undefined
        : normalizeNullable(employeeBody.designation),
    employee_code: employeeBody.employee_code?.trim().toUpperCase(),
    employment_type: employeeBody.employment_type,
    first_name: employeeBody.first_name?.trim(),
    joining_date:
      employeeBody.joining_date === undefined
        ? undefined
        : employeeBody.joining_date,
    last_name:
      employeeBody.last_name === undefined
        ? undefined
        : normalizeNullable(employeeBody.last_name),
    manager_employee_id:
      employeeBody.manager_employee_id === undefined
        ? undefined
        : normalizeNullable(employeeBody.manager_employee_id),
    phone:
      employeeBody.phone === undefined
        ? undefined
        : normalizeNullable(employeeBody.phone),
    status: employeeBody.status,
    work_email:
      employeeBody.work_email === undefined ? undefined : nextWorkEmail,
    updated_by: userId,
  };
}

async function syncEmployeeRole(params: {
  employeeId: string;
  roleId?: string | null;
  supabaseAdmin: SupabaseAdminClient;
  userId?: string;
  workspaceId: string;
}) {
  if (params.roleId === undefined) {
    return;
  }

  const hrms = getHrmsClient(params.supabaseAdmin);

  const { error: deleteExistingRolesError } = await hrms
    .from('employee_roles')
    .delete()
    .eq('workspace_id', params.workspaceId)
    .eq('employee_id', params.employeeId);

  if (deleteExistingRolesError) {
    throw new ApiError(deleteExistingRolesError.message, 400);
  }

  if (!params.roleId) {
    return;
  }

  const { data: role, error: roleError } = await params.supabaseAdmin
    .from('workspace_roles')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('id', params.roleId)
    .maybeSingle();

  if (roleError || !role) {
    throw new ApiError('Role is invalid', 400);
  }

  const { error: employeeRoleInsertError } = await hrms
    .from('employee_roles')
    .insert({
      workspace_id: params.workspaceId,
      employee_id: params.employeeId,
      role_id: params.roleId,
      created_by: params.userId,
      updated_by: params.userId,
    });

  if (employeeRoleInsertError) {
    throw new ApiError(employeeRoleInsertError.message, 400);
  }
}

function buildEmployeeOptions(params: {
  accounts: Array<{ email: string | null; id: string; name: string }> | null;
  departments: Array<{ id: string; name: string }> | null;
  employeeRoles: EmployeeRoleAssignment[] | null;
  employees: EmployeeOptionEmployee[] | null;
  roles: EmployeeOptionRole[] | null;
  shifts: Array<{ id: string; is_active: boolean; name: string }> | null;
}) {
  const assignedAccountIds = new Set(
    (params.employees ?? [])
      .map((employee) => employee.account_id)
      .filter((value): value is string => Boolean(value)),
  );

  const eligibleAccounts = (params.accounts ?? []).filter(
    (account, index, accounts) =>
      !assignedAccountIds.has(account.id) &&
      accounts.findIndex((item) => item.id === account.id) === index,
  );

  const managerRoleIds = new Set(
    (params.roles ?? [])
      .filter((role) => ['admin', 'manager'].includes(role.role_key))
      .map((role) => role.id),
  );
  const managerEmployeeIds = new Set(
    (params.employeeRoles ?? [])
      .filter((assignment) => managerRoleIds.has(assignment.role_id))
      .map((assignment) => assignment.employee_id),
  );

  return {
    departments: params.departments ?? [],
    eligibleAccounts,
    roles: params.roles ?? [],
    shifts: params.shifts ?? [],
    managers: (params.employees ?? [])
      .filter(
        (employee) =>
          employee.status !== 'invited' && managerEmployeeIds.has(employee.id),
      )
      .map((employee) => ({
        id: employee.id,
        name: getEmployeeName(employee),
        employee_code: employee.employee_code,
      })),
  };
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function mapById<T extends { id: string }>(values: T[]) {
  return new Map(values.map((value) => [value.id, value]));
}

function getEmployeeName(
  employee: Pick<EmployeeOptionEmployee, 'first_name' | 'last_name'>,
) {
  return `${employee.first_name}${employee.last_name ? ` ${employee.last_name}` : ''}`;
}

function getFeatureAliases(moduleKey: string, featureKey: string) {
  if (moduleKey === 'hrms_departments') {
    if (featureKey === 'create') {
      return ['create', 'manage'];
    }

    if (featureKey === 'edit' || featureKey === 'update') {
      return ['edit', 'update', 'manage'];
    }

    if (featureKey === 'delete') {
      return ['delete', 'manage'];
    }
  }

  if (moduleKey === 'hrms_documents') {
    if (featureKey === 'create') {
      return ['create', 'upload', 'manage'];
    }

    if (featureKey === 'edit' || featureKey === 'update') {
      return ['edit', 'update', 'manage'];
    }

    if (featureKey === 'delete') {
      return ['delete', 'manage'];
    }

    if (featureKey === 'upload') {
      return ['upload', 'create', 'manage'];
    }
  }

  if (featureKey === 'edit') {
    return ['edit', 'update'];
  }

  if (featureKey === 'update') {
    return ['update', 'edit'];
  }

  return [featureKey];
}

export {
  buildEmployeeInsertPayload,
  buildEmployeeOptions,
  buildEmployeeUpdatePayload,
  enrichEmployees,
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
  syncEmployeeRole,
};
export type { EmployeeRow, SupabaseAdminClient };
