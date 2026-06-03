import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { Database } from '~/lib/database.types';
import { ApiError } from '~/utils/response-handler';

const departmentSelect = `
  id,
  organization_id,
  name,
  code,
  cost_center_code,
  is_active,
  head_account_id,
  parent_department_id,
  created_at,
  updated_at,
  head_account:accounts!departments_head_account_id_fkey (
    id,
    name,
    email
  )
`;

type DepartmentRow = {
  code: string;
  cost_center_code: string | null;
  created_at: string;
  head_account: {
    email: string | null;
    id: string;
    name: string;
  } | null;
  head_account_id: string | null;
  id: string;
  is_active: boolean;
  name: string;
  organization_id: string;
  parent_department_id: string | null;
  updated_at: string;
};

function normalizeNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function getDepartmentId(params?: Record<string, string>) {
  const departmentId = params?.departmentId;

  if (!departmentId) {
    throw new ApiError('Department id is required', 400);
  }

  return departmentId;
}

async function getDepartmentHeadAccounts(organizationId: string) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  const [
    { data: organization, error: organizationError },
    { data: employees, error: employeesError },
  ] = await Promise.all([
    supabaseAdmin
      .from('organizations')
      .select('owner:accounts!organizations_owner_id_fkey(id, name, email)')
      .eq('id', organizationId)
      .maybeSingle(),
    supabaseAdmin
      .from('employees')
      .select(
        'status, account:accounts!employees_account_id_fkey(id, name, email)',
      )
      .eq('organization_id', organizationId)
      .not('account_id', 'is', null),
  ]);

  if (organizationError) {
    throw new ApiError(organizationError.message, 400);
  }

  if (employeesError) {
    throw new ApiError(employeesError.message, 400);
  }

  const headAccounts = new Map<
    string,
    { id: string; name: string; email: string | null }
  >();

  const ownerAccount = organization?.owner;
  const invitedAccountIds = new Set(
    (employees ?? [])
      .filter((employee) => employee.status === 'invited')
      .map((employee) => {
        const account = employee.account;

        return account && !Array.isArray(account) ? account.id : null;
      })
      .filter((value): value is string => Boolean(value)),
  );

  if (
    ownerAccount &&
    !Array.isArray(ownerAccount) &&
    !invitedAccountIds.has(ownerAccount.id)
  ) {
    headAccounts.set(ownerAccount.id, ownerAccount);
  }

  for (const employee of employees ?? []) {
    if (employee.status === 'invited') {
      continue;
    }

    const account = employee.account;

    if (!account || Array.isArray(account)) {
      continue;
    }

    headAccounts.set(account.id, account);
  }

  return Array.from(headAccounts.values()).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

async function withParentDepartments(params: {
  departments: DepartmentRow[];
  organizationId: string;
}) {
  const parentDepartmentIds = Array.from(
    new Set(
      params.departments
        .map((department) => department.parent_department_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (parentDepartmentIds.length === 0) {
    return params.departments.map((department) => ({
      ...department,
      parent_department: null,
    }));
  }

  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const { data: parentDepartments, error } = await supabaseAdmin
    .from('departments')
    .select('id, name, code')
    .eq('organization_id', params.organizationId)
    .in('id', parentDepartmentIds);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const parentDepartmentMap = new Map(
    (parentDepartments ?? []).map((department) => [department.id, department]),
  );

  return params.departments.map((department) => ({
    ...department,
    parent_department: department.parent_department_id
      ? parentDepartmentMap.get(department.parent_department_id) ?? null
      : null,
  }));
}

async function validateDepartmentReferences(params: {
  headAccountId?: string | null;
  organizationId: string;
  parentDepartmentId: string | null;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  if (params.parentDepartmentId) {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('id', params.parentDepartmentId)
      .eq('organization_id', params.organizationId)
      .maybeSingle();

    if (error || !data) {
      throw new ApiError('Parent department is invalid', 400);
    }
  }

  if (params.headAccountId) {
    const [
      { data: organizationOwner, error: organizationOwnerError },
      { data: employee, error: employeeError },
    ] = await Promise.all([
      supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('id', params.organizationId)
        .eq('owner_id', params.headAccountId)
        .maybeSingle(),
      supabaseAdmin
        .from('employees')
        .select('id, status')
        .eq('organization_id', params.organizationId)
        .eq('account_id', params.headAccountId)
        .maybeSingle(),
    ]);

    if (organizationOwnerError) {
      throw new ApiError(organizationOwnerError.message, 400);
    }

    if (employeeError) {
      throw new ApiError(employeeError.message, 400);
    }

    if (employee?.status === 'invited') {
      throw new ApiError('Department head is invalid', 400);
    }

    if (!organizationOwner && !employee) {
      throw new ApiError('Department head is invalid', 400);
    }
  }
}
export {
  departmentSelect,
  getDepartmentHeadAccounts,
  normalizeNullable,
  getDepartmentId,
  validateDepartmentReferences,
  withParentDepartments,
};
