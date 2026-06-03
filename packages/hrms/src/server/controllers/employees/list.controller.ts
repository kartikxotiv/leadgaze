import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  type EmployeeRow,
  enrichEmployees,
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from './controller.helpers';

const DEFAULT_EMPLOYEE_PAGE_SIZE = 10;
const MAX_EMPLOYEE_PAGE_SIZE = 100;
const employeeStatuses = [
  'invited',
  'active',
  'probation',
  'notice_period',
  'inactive',
  'exited',
] as const;
type EmployeeStatus = (typeof employeeStatuses)[number];

const listEmployeesController = catchAsync(async ({ request, user }) => {
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
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const searchParams = new URL(request.url).searchParams;
  const status = searchParams.get('status');
  const search = searchParams.get('search')?.trim() ?? '';
  const isPaginated = searchParams.has('page') || searchParams.has('pageSize');
  const page = isPaginated
    ? parsePositiveInteger(searchParams.get('page'), 1)
    : 1;
  const pageSize = isPaginated
    ? Math.min(
        parsePositiveInteger(
          searchParams.get('pageSize'),
          DEFAULT_EMPLOYEE_PAGE_SIZE,
        ),
        MAX_EMPLOYEE_PAGE_SIZE,
      )
    : DEFAULT_EMPLOYEE_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const includeInvited = searchParams.get('includeInvited') !== 'false';
  const statuses = parseEmployeeStatuses(status);
  const excludeRoleKeys = (
    searchParams.get('exclude') ??
    searchParams.get('excludeRole') ??
    ''
  )
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const excludedEmployeeIds = await getExcludedEmployeeIdsByRoleKeys({
    excludeRoleKeys,
    hrms,
    supabaseAdmin,
    workspaceId,
  });

  const searchFilter = await buildEmployeeSearchFilter({
    hrms,
    search,
    workspaceId,
  });
  const scope = {
    excludedEmployeeIds,
    hrms,
    includeInvited,
    searchFilter,
    statuses,
    workspaceId,
  };

  let query = createScopedEmployeesQuery(scope, '*', {
    count: isPaginated ? 'exact' : undefined,
  }).order('created_at', { ascending: false });

  if (isPaginated) {
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const employees = await enrichEmployees({
    employees: data as EmployeeRow[],
    supabaseAdmin,
    workspaceId,
  });

  if (isPaginated) {
    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    const summary = await getEmployeeListSummary({
      ...scope,
      totalCount: total,
    });

    return successDataResponse('Employees fetched successfully', {
      employees,
      pagination: {
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        page,
        pageSize,
        total,
        totalPages,
      },
      summary,
    });
  }

  return successDataResponse('Employees fetched successfully', employees);
});

function parsePositiveInteger(value: string | null, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return parsedValue;
}

function parseEmployeeStatuses(status: string | null) {
  if (!status) {
    return [];
  }

  return status
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .map((value) => (value === 'notice' ? 'notice_period' : value))
    .filter((value): value is EmployeeStatus =>
      employeeStatuses.includes(value as EmployeeStatus),
    );
}

function normalizeSearchTerm(value: string) {
  return value
    .replace(/[%(),]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function buildEmployeeSearchFilter(params: {
  hrms: ReturnType<typeof getHrmsClient>;
  search: string;
  workspaceId: string;
}) {
  const normalizedSearch = normalizeSearchTerm(params.search);

  if (!normalizedSearch) {
    return '';
  }

  const pattern = `%${normalizedSearch}%`;
  const filters = [
    `first_name.ilike.${pattern}`,
    `last_name.ilike.${pattern}`,
    `work_email.ilike.${pattern}`,
    `employee_code.ilike.${pattern}`,
    `designation.ilike.${pattern}`,
  ];
  const normalizedStatusSearch = normalizedSearch
    .toLowerCase()
    .replace(/\s+/g, '_');
  const matchingStatuses = employeeStatuses.filter((employeeStatus) => {
    const displayStatus = employeeStatus.replace(/_/g, ' ');

    return (
      employeeStatus.includes(normalizedStatusSearch) ||
      displayStatus.includes(normalizedSearch.toLowerCase())
    );
  });

  if (matchingStatuses.length > 0) {
    filters.push(`status.in.(${matchingStatuses.join(',')})`);
  }

  const [departmentsResult, managersResult] = await Promise.all([
    params.hrms
      .from('departments')
      .select('id')
      .eq('workspace_id', params.workspaceId)
      .or(`name.ilike.${pattern},code.ilike.${pattern}`),
    params.hrms
      .from('employees')
      .select('id')
      .eq('workspace_id', params.workspaceId)
      .neq('status', 'exited')
      .or(
        [
          `first_name.ilike.${pattern}`,
          `last_name.ilike.${pattern}`,
          `employee_code.ilike.${pattern}`,
          `work_email.ilike.${pattern}`,
        ].join(','),
      ),
  ]);

  if (departmentsResult.error) {
    throw new ApiError(departmentsResult.error.message, 400);
  }

  if (managersResult.error) {
    throw new ApiError(managersResult.error.message, 400);
  }

  const departmentIds = (departmentsResult.data ?? []).map(
    (department: { id: string }) => department.id,
  );
  const managerIds = (managersResult.data ?? []).map(
    (manager: { id: string }) => manager.id,
  );

  if (departmentIds.length > 0) {
    filters.push(`department_id.in.(${departmentIds.join(',')})`);
  }

  if (managerIds.length > 0) {
    filters.push(`manager_employee_id.in.(${managerIds.join(',')})`);
  }

  return filters.join(',');
}

async function getExcludedEmployeeIdsByRoleKeys(params: {
  excludeRoleKeys: string[];
  hrms: ReturnType<typeof getHrmsClient>;
  supabaseAdmin: any;
  workspaceId: string;
}): Promise<string[]> {
  if (params.excludeRoleKeys.length === 0) {
    return [];
  }

  const { data: roles, error: rolesError } = await params.supabaseAdmin
    .from('workspace_roles')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .in('role_key', params.excludeRoleKeys);

  if (rolesError) {
    throw new ApiError(rolesError.message, 400);
  }

  const roleIds = ((roles ?? []) as Array<{ id: string }>).map(
    (role) => role.id,
  );

  if (roleIds.length === 0) {
    return [];
  }

  const { data: assignments, error: assignmentsError } = await params.hrms
    .from('employee_roles')
    .select('employee_id')
    .eq('workspace_id', params.workspaceId)
    .in('role_id', roleIds);

  if (assignmentsError) {
    throw new ApiError(assignmentsError.message, 400);
  }

  return Array.from(
    new Set(
      (assignments ?? []).map(
        (assignment: { employee_id: string }) => assignment.employee_id,
      ),
    ),
  ) as string[];
}

async function getEmployeeListSummary(params: {
  excludedEmployeeIds: string[];
  hrms: ReturnType<typeof getHrmsClient>;
  includeInvited: boolean;
  searchFilter: string;
  statuses: EmployeeStatus[];
  totalCount: number;
  workspaceId: string;
}) {
  const [activeResult, invitedResult, departmentCoverageResult] =
    await Promise.all([
      createScopedEmployeesQuery(params, 'id', {
        count: 'exact',
        head: true,
      }).eq('status', 'active'),
      createScopedEmployeesQuery(params, 'id', {
        count: 'exact',
        head: true,
      }).eq('status', 'invited'),
      createScopedEmployeesQuery(params, 'department_id').not(
        'department_id',
        'is',
        null,
      ),
    ]);

  for (const result of [
    activeResult,
    invitedResult,
    departmentCoverageResult,
  ]) {
    if (result.error) {
      throw new ApiError(result.error.message, 400);
    }
  }

  const departmentIds = new Set(
    (departmentCoverageResult.data ?? [])
      .map(
        (employee: { department_id: string | null }) => employee.department_id,
      )
      .filter((value: string | null): value is string => Boolean(value)),
  );

  return {
    activeCount: activeResult.count ?? 0,
    departmentCoverage: departmentIds.size,
    invitedCount: invitedResult.count ?? 0,
    totalCount: params.totalCount,
  };
}

function createScopedEmployeesQuery(
  params: {
    excludedEmployeeIds: string[];
    hrms: ReturnType<typeof getHrmsClient>;
    includeInvited: boolean;
    searchFilter: string;
    statuses: EmployeeStatus[];
    workspaceId: string;
  },
  select: string,
  options?: {
    count?: 'exact';
    head?: boolean;
  },
) {
  let query = params.hrms
    .from('employees')
    .select(select, options)
    .eq('workspace_id', params.workspaceId)
    .eq('is_deleted', false)
    .neq('status', 'exited');

  if (!params.includeInvited) {
    query = query.neq('status', 'invited');
  }

  if (params.statuses.length > 0) {
    query = query.in('status', params.statuses);
  }

  if (params.excludedEmployeeIds.length > 0) {
    query = query.not('id', 'in', `(${params.excludedEmployeeIds.join(',')})`);
  }

  if (params.searchFilter) {
    query = query.or(params.searchFilter);
  }

  return query;
}

export { listEmployeesController };
