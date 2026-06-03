import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import { ApiError } from '~/utils/response-handler';

import { EmployeeBody, normalizeNullable } from './utils';

type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];
type EmployeeStatus = Database['public']['Enums']['employee_status'];
type SupabaseAdminClient = ReturnType<
  typeof getSupabaseServerAdminClient<Database>
>;

type EmployeeWithRoles = {
  employee_roles?: Array<{ role_id: string | null }> | null;
};

type EmployeeWithManagerId = {
  manager_employee_id?: string | null;
};

type EmployeeManager = {
  employee_code: string;
  first_name: string;
  id: string;
  last_name: string | null;
};

type EmployeeOptionDepartment = {
  id: string;
  name: string;
};

type EmployeeOptionEmployee = {
  account_id: string | null;
  employee_code: string;
  first_name: string;
  id: string;
  last_name: string | null;
  status: EmployeeStatus;
};

type EmployeeOptionAccount = {
  email: string | null;
  id: string;
  name: string;
};

type EmployeeOptionRole = {
  id: string;
  role_key: string;
  role_name: string;
};

type EmployeeOptionShift = {
  id: string;
  is_active: boolean;
  name: string;
};

type EmployeeRoleAssignment = {
  employee_id: string;
  role_id: string;
};

const employeeSelect = `
  id,
  organization_id,
  account_id,
  department_id,
  shift_id,
  employee_code,
  first_name,
  last_name,
  work_email,
  phone,
  designation,
  joining_date,
  employment_type,
  status,
  invited_at,
  manager_employee_id,
  created_at,
  updated_at,
  account:accounts!employees_account_id_fkey (
    id,
    name,
    email
  ),
  department:departments!employees_department_id_fkey (
    id,
    name,
    code
  ),
  shift:shifts!employees_shift_id_fkey (
    id,
    name,
    start_time,
    end_time,
    grace_minutes,
    is_active
  ),
  employee_roles:employee_roles(role_id)
`;

async function getRequiredOrganizationId(userId?: string) {
  const organizationId = await getCurrentUserOrganizationId(userId);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  return organizationId;
}

function formatEmployeesWithRoleId<T extends EmployeeWithRoles>(
  data: T[] | null,
) {
  return (data ?? []).map((employee) => ({
    ...employee,
    role_id: employee.employee_roles?.[0]?.role_id ?? null,
  }));
}

async function attachEmployeeManagers<T extends EmployeeWithManagerId>(params: {
  employees: T[] | null;
  organizationId: string;
  supabaseAdmin: SupabaseAdminClient;
}): Promise<Array<T & { manager: EmployeeManager | null }>> {
  const employees = params.employees ?? [];
  const managerIds = Array.from(
    new Set(
      employees
        .map((employee) => employee.manager_employee_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (managerIds.length === 0) {
    return employees.map((employee) => ({
      ...employee,
      manager: null,
    }));
  }

  const { data, error } = await params.supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, employee_code')
    .eq('organization_id', params.organizationId)
    .in('id', managerIds);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const managersById = new Map(
    ((data ?? []) as EmployeeManager[]).map((manager) => [manager.id, manager]),
  );

  return employees.map((employee) => ({
    ...employee,
    manager: employee.manager_employee_id
      ? (managersById.get(employee.manager_employee_id) ?? null)
      : null,
  }));
}

function buildEmployeeInsertPayload(params: {
  accountId: string | null;
  employeeBody: EmployeeBody;
  invitedAt: string | null;
  organizationId: string;
  status: EmployeeStatus;
  userId?: string;
}): EmployeeInsert {
  const { accountId, employeeBody, invitedAt, organizationId, status, userId } =
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
    organization_id: organizationId,
    phone: normalizeNullable(employeeBody.phone),
    status,
    work_email: employeeBody.work_email?.trim().toLowerCase() ?? '',
    created_by: userId,
    updated_by: userId,
  };
}

function buildEmployeeUpdatePayload(params: {
  employeeBody: EmployeeBody;
  nextWorkEmail: string;
  userId?: string;
}): EmployeeUpdate {
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
  organizationId: string;
  roleId?: string | null;
  supabaseAdmin: SupabaseAdminClient;
  userId?: string;
}) {
  if (!params.roleId) {
    return;
  }

  const { data: existingEmployeeRole, error: employeeRoleFetchError } =
    await params.supabaseAdmin
      .from('employee_roles')
      .select('id')
      .eq('organization_id', params.organizationId)
      .eq('employee_id', params.employeeId)
      .maybeSingle();

  if (employeeRoleFetchError) {
    throw new ApiError(employeeRoleFetchError.message, 400);
  }

  if (existingEmployeeRole) {
    const { error: employeeRoleUpdateError } = await params.supabaseAdmin
      .from('employee_roles')
      .update({
        role_id: params.roleId,
        updated_by: params.userId,
      })
      .eq('id', existingEmployeeRole.id);

    if (employeeRoleUpdateError) {
      throw new ApiError(employeeRoleUpdateError.message, 400);
    }

    return;
  }

  const { error: employeeRoleInsertError } = await params.supabaseAdmin
    .from('employee_roles')
    .insert({
      organization_id: params.organizationId,
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
  accounts: EmployeeOptionAccount[] | null;
  departments: EmployeeOptionDepartment[] | null;
  employeeRoles: EmployeeRoleAssignment[] | null;
  employees: EmployeeOptionEmployee[] | null;
  roles: EmployeeOptionRole[] | null;
  shifts: EmployeeOptionShift[] | null;
}) {
  const assignedAccountIds = new Set(
    (params.employees ?? [])
      .map((employee) => employee.account_id)
      .filter((value): value is string => Boolean(value)),
  );

  const eligibleAccounts = (params.accounts ?? []).reduce<
    EmployeeOptionAccount[]
  >((result, account) => {
    if (assignedAccountIds.has(account.id)) {
      return result;
    }

    if (result.some((item) => item.id === account.id)) {
      return result;
    }

    result.push(account);
    return result;
  }, []);

  const managerEligibleRoleKeys = new Set(['admin', 'manager']);
  const managerRoleIds = new Set(
    (params.roles ?? [])
      .filter((role) => managerEligibleRoleKeys.has(role.role_key))
      .map((role) => role.id),
  );

  const managerEmployeeIds = new Set(
    (params.employeeRoles ?? [])
      .filter((assignment) => managerRoleIds.has(assignment.role_id))
      .map((assignment) => assignment.employee_id),
  );

  const managers = (params.employees ?? [])
    .filter(
      (employee) =>
        employee.status !== 'invited' && managerEmployeeIds.has(employee.id),
    )
    .map((employee) => ({
      id: employee.id,
      name: getEmployeeName(employee),
      employee_code: employee.employee_code,
    }));

  return {
    departments: params.departments ?? [],
    eligibleAccounts,
    roles: params.roles ?? [],
    shifts: params.shifts ?? [],
    managers,
  };
}

function getEmployeeName(
  employee: Pick<EmployeeOptionEmployee, 'first_name' | 'last_name'>,
) {
  return `${employee.first_name}${employee.last_name ? ` ${employee.last_name}` : ''}`;
}

export {
  attachEmployeeManagers,
  buildEmployeeInsertPayload,
  buildEmployeeOptions,
  buildEmployeeUpdatePayload,
  employeeSelect,
  formatEmployeesWithRoleId,
  getRequiredOrganizationId,
  syncEmployeeRole,
};
