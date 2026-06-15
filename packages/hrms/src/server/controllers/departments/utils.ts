import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError } from '../../../utils/response-handler';
import {
  type SupabaseAdminClient,
  getHrmsClient,
} from '../employees/controller.helpers';

const departmentSelect = `
  id,
  workspace_id,
  name,
  code,
  cost_center_code,
  is_active,
  head_account_id,
  parent_department_id,
  created_at,
  updated_at,
  created_by,
  updated_by
`;

type DepartmentRow = {
  code: string;
  cost_center_code: string | null;
  created_at: string;
  created_by: string | null;
  head_account_id: string | null;
  id: string;
  is_active: boolean;
  name: string;
  parent_department_id: string | null;
  updated_at: string;
  updated_by: string | null;
  workspace_id: string;
};

type DepartmentHeadAccount = {
  email: string | null;
  id: string;
  name: string;
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

async function getDepartmentHeadAccounts(
  workspaceId: string,
  supabaseAdmin = getSupabaseServerAdminClient() as SupabaseAdminClient,
) {
  const hrms = getHrmsClient(supabaseAdmin);
  const [
    { data: workspace, error: workspaceError },
    { data: employees, error: employeesError },
  ] = await Promise.all([
    supabaseAdmin
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .maybeSingle(),
    hrms
      .from('employees')
      .select('account_id, status')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .not('account_id', 'is', null),
  ]);

  if (workspaceError) {
    throw new ApiError(workspaceError.message, 400);
  }

  if (employeesError) {
    throw new ApiError(employeesError.message, 400);
  }

  const accountIds = uniqueIds([
    (workspace as { owner_id?: string | null } | null)?.owner_id,
    ...(
      (employees ?? []) as Array<{
        account_id: string | null;
        status: string;
      }>
    )
      .filter((employee) => employee.status !== 'invited')
      .map((employee) => employee.account_id),
  ]);

  if (accountIds.length === 0) {
    return [];
  }

  const { data: accounts, error: accountsError } = await supabaseAdmin
    .from('accounts')
    .select('id, name, email')
    .in('id', accountIds);

  if (accountsError) {
    throw new ApiError(accountsError.message, 400);
  }

  return ((accounts ?? []) as DepartmentHeadAccount[]).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

async function withDepartmentRelations(params: {
  departments: DepartmentRow[];
  supabaseAdmin: SupabaseAdminClient;
  workspaceId: string;
}) {
  const parentDepartmentIds = uniqueIds(
    params.departments.map((department) => department.parent_department_id),
  );
  const headAccountIds = uniqueIds(
    params.departments.map((department) => department.head_account_id),
  );
  const hrms = getHrmsClient(params.supabaseAdmin);

  const [parentDepartmentsResult, accountsResult] = await Promise.all([
    parentDepartmentIds.length > 0
      ? hrms
          .from('departments')
          .select('id, name, code')
          .eq('workspace_id', params.workspaceId)
          .in('id', parentDepartmentIds)
      : Promise.resolve({ data: [], error: null }),
    headAccountIds.length > 0
      ? params.supabaseAdmin
          .from('accounts')
          .select('id, name, email')
          .in('id', headAccountIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (parentDepartmentsResult.error) {
    throw new ApiError(parentDepartmentsResult.error.message, 400);
  }

  if (accountsResult.error) {
    throw new ApiError(accountsResult.error.message, 400);
  }

  const parentDepartmentMap = mapById(
    (parentDepartmentsResult.data ?? []) as Array<{ id: string }>,
  );
  const accountsMap = mapById(
    (accountsResult.data ?? []) as DepartmentHeadAccount[],
  );

  return params.departments.map((department) => ({
    ...department,
    organization_id: department.workspace_id,
    head_account: department.head_account_id
      ? (accountsMap.get(department.head_account_id) ?? null)
      : null,
    parent_department: department.parent_department_id
      ? (parentDepartmentMap.get(department.parent_department_id) ?? null)
      : null,
  }));
}

async function validateDepartmentReferences(params: {
  departmentId?: string;
  headAccountId?: string | null;
  parentDepartmentId?: string | null;
  supabaseAdmin: SupabaseAdminClient;
  workspaceId: string;
}) {
  const hrms = getHrmsClient(params.supabaseAdmin);

  if (params.parentDepartmentId) {
    if (
      params.departmentId &&
      params.departmentId === params.parentDepartmentId
    ) {
      throw new ApiError('Department cannot be its own parent', 400);
    }

    const { data, error } = await hrms
      .from('departments')
      .select('id')
      .eq('id', params.parentDepartmentId)
      .eq('workspace_id', params.workspaceId)
      .maybeSingle();

    if (error || !data) {
      throw new ApiError('Parent department is invalid', 400);
    }
  }

  if (params.headAccountId) {
    const [
      { data: workspaceOwner, error: workspaceOwnerError },
      { data: workspaceMember, error: workspaceMemberError },
      { data: employee, error: employeeError },
    ] = await Promise.all([
      params.supabaseAdmin
        .from('workspaces')
        .select('id')
        .eq('id', params.workspaceId)
        .eq('owner_id', params.headAccountId)
        .maybeSingle(),
      params.supabaseAdmin
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', params.workspaceId)
        .eq('user_id', params.headAccountId)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle(),
      hrms
        .from('employees')
        .select('id, status')
        .eq('workspace_id', params.workspaceId)
        .eq('account_id', params.headAccountId)
        .eq('is_deleted', false)
        .limit(1)
        .maybeSingle(),
    ]);

    if (workspaceOwnerError) {
      throw new ApiError(workspaceOwnerError.message, 400);
    }

    if (workspaceMemberError) {
      throw new ApiError(workspaceMemberError.message, 400);
    }

    if (employeeError) {
      throw new ApiError(employeeError.message, 400);
    }

    if (!workspaceOwner && !workspaceMember) {
      throw new ApiError('Department head is invalid', 400);
    }

    if (employee && (employee as { status: string }).status === 'invited') {
      throw new ApiError('Department head is invalid', 400);
    }
  }
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function mapById<T extends { id: string }>(values: T[]) {
  return new Map(values.map((value) => [value.id, value]));
}

export {
  departmentSelect,
  getDepartmentHeadAccounts,
  getDepartmentId,
  normalizeNullable,
  validateDepartmentReferences,
  withDepartmentRelations,
};
export type { DepartmentRow };
