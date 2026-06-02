import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  attachEmployeeManagers,
  employeeSelect,
  formatEmployeesWithRoleId,
  getRequiredOrganizationId,
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

type EmployeeListScope = {
  excludedEmployeeIds: string[];
  includeInvited: boolean;
  organizationId: string;
  searchFilter: string;
  statuses: EmployeeStatus[];
  supabaseAdmin: ReturnType<typeof getSupabaseServerAdminClient<Database>>;
};

const listEmployeesController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getRequiredOrganizationId(user?.id);
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
    organizationId,
    supabaseAdmin,
  });

  const searchFilter = await buildEmployeeSearchFilter({
    organizationId,
    search,
    supabaseAdmin,
  });
  const employeeListScope = {
    excludedEmployeeIds,
    includeInvited,
    organizationId,
    searchFilter,
    statuses,
    supabaseAdmin,
  };

  let query = createScopedEmployeesQuery(
    employeeListScope,
    employeeSelect,
    isPaginated ? { count: 'exact' } : undefined,
  ).order('created_at', { ascending: false });

  if (isPaginated) {
    query = query.range(from, to);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const employees = data ?? [];

  const employeesWithManagers = await attachEmployeeManagers({
    employees: formatEmployeesWithRoleId(employees),
    organizationId,
    supabaseAdmin,
  });

  if (isPaginated) {
    const total = count ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    const summary = await getEmployeeListSummary({
      ...employeeListScope,
      totalCount: total,
    });

    return successDataResponse('Employees fetched successfully', {
      employees: employeesWithManagers,
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

  return successDataResponse(
    'Employees fetched successfully',
    employeesWithManagers,
  );
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
  organizationId: string;
  search: string;
  supabaseAdmin: ReturnType<typeof getSupabaseServerAdminClient<Database>>;
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
    params.supabaseAdmin
      .from('departments')
      .select('id')
      .eq('organization_id', params.organizationId)
      .or(`name.ilike.${pattern},code.ilike.${pattern}`),
    params.supabaseAdmin
      .from('employees')
      .select('id')
      .eq('organization_id', params.organizationId)
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
    (department) => department.id,
  );
  const managerIds = (managersResult.data ?? []).map((manager) => manager.id);

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
  organizationId: string;
  supabaseAdmin: ReturnType<typeof getSupabaseServerAdminClient<Database>>;
}) {
  if (params.excludeRoleKeys.length === 0) {
    return [];
  }

  const { data: roles, error: rolesError } = await params.supabaseAdmin
    .from('roles')
    .select('id')
    .eq('organization_id', params.organizationId)
    .in('role_key', params.excludeRoleKeys);

  if (rolesError) {
    throw new ApiError(rolesError.message, 400);
  }

  const roleIds = (roles ?? []).map((role) => role.id);

  if (roleIds.length === 0) {
    return [];
  }

  const { data: assignments, error: assignmentsError } =
    await params.supabaseAdmin
      .from('employee_roles')
      .select('employee_id')
      .eq('organization_id', params.organizationId)
      .in('role_id', roleIds);

  if (assignmentsError) {
    throw new ApiError(assignmentsError.message, 400);
  }

  return Array.from(
    new Set((assignments ?? []).map((assignment) => assignment.employee_id)),
  );
}

async function getEmployeeListSummary(params: {
  excludedEmployeeIds: string[];
  includeInvited: boolean;
  organizationId: string;
  searchFilter: string;
  statuses: EmployeeStatus[];
  supabaseAdmin: ReturnType<typeof getSupabaseServerAdminClient<Database>>;
  totalCount: number;
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

  if (activeResult.error) {
    throw new ApiError(activeResult.error.message, 400);
  }

  if (invitedResult.error) {
    throw new ApiError(invitedResult.error.message, 400);
  }

  if (departmentCoverageResult.error) {
    throw new ApiError(departmentCoverageResult.error.message, 400);
  }

  const departmentIds = new Set(
    (departmentCoverageResult.data ?? [])
      .map((employee) => employee.department_id)
      .filter((value): value is string => Boolean(value)),
  );

  return {
    activeCount: activeResult.count ?? 0,
    departmentCoverage: departmentIds.size,
    invitedCount: invitedResult.count ?? 0,
    totalCount: params.totalCount,
  };
}

function createScopedEmployeesQuery<SelectQuery extends string>(
  params: EmployeeListScope,
  select: SelectQuery,
  options?: {
    count?: 'exact';
    head?: boolean;
  },
) {
  let query = params.supabaseAdmin
    .from('employees')
    .select(select, options)
    .eq('organization_id', params.organizationId)
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
