/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError } from '../../../utils/response-handler';
import {
  getHrmsClient,
  getRouteUserId,
  requireEmployeePermission,
} from '../employees/controller.helpers';

type AccessLevel = 'none' | 'own' | 'team' | 'all';

type SelfServiceContext = {
  accessLevel: AccessLevel;
  canCreateRequest: boolean;
  canDownloadPayslip: boolean;
  canUpdateProfile: boolean;
  employeeId: string;
  hrms: any;
  supabaseAdmin: any;
  userId: string;
  workspaceId: string;
};

const moduleKey = 'hrms_self_service';

type SelfServiceEmployeeIdentity = {
  account_id: string | null;
  id: string;
  work_email?: string | null;
  workspace_id: string;
};

type AccountProfile = {
  email: string | null;
  name: string | null;
};

async function hasSelfServicePermission(params: {
  featureKey: string;
  minAccessLevel?: 'own' | 'team' | 'all';
  supabaseAdmin: any;
  userId: string;
  workspaceId: string;
}) {
  try {
    await requireEmployeePermission({
      featureKey: params.featureKey,
      minAccessLevel: params.minAccessLevel ?? 'own',
      moduleKey,
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

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEmail(value: unknown) {
  return normalizeText(value)?.toLowerCase() ?? null;
}

function escapeIlikePattern(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

async function getAccountEmail(params: {
  supabaseAdmin: any;
  user: unknown;
  userId: string;
}) {
  const jwtEmail = normalizeEmail((params.user as { email?: string })?.email);

  if (jwtEmail) {
    return jwtEmail;
  }

  const { data, error } = await params.supabaseAdmin
    .from('accounts')
    .select('email')
    .eq('id', params.userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return normalizeEmail((data as { email?: string | null } | null)?.email);
}

async function getAccountProfile(params: {
  supabaseAdmin: any;
  user: unknown;
  userId: string;
}) {
  const jwtUser = params.user as
    | {
        email?: string;
        user_metadata?: {
          full_name?: string;
          name?: string;
        };
      }
    | undefined;
  const jwtEmail = normalizeEmail(jwtUser?.email);
  const jwtName = normalizeText(
    jwtUser?.user_metadata?.name ?? jwtUser?.user_metadata?.full_name,
  );

  const { data, error } = await params.supabaseAdmin
    .from('accounts')
    .select('email, name')
    .eq('id', params.userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const account = data as AccountProfile | null;

  return {
    email: normalizeEmail(account?.email) ?? jwtEmail,
    name: normalizeText(account?.name) ?? jwtName,
  } satisfies AccountProfile;
}

async function getAcceptedWorkspaceIds(params: {
  request: Request;
  supabaseAdmin: any;
  userId: string;
}) {
  const preferredWorkspaceId =
    (params.request as any).cookies?.get('organization_id')?.value ??
    new URL(params.request.url).searchParams.get('workspace_id') ??
    params.request.headers.get('x-workspace-id');

  const { data, error } = await params.supabaseAdmin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', params.userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: true });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const workspaceIds = ((data ?? []) as Array<{ workspace_id?: string | null }>)
    .map((member) => member.workspace_id)
    .filter((workspaceId): workspaceId is string => Boolean(workspaceId));

  if (preferredWorkspaceId && workspaceIds.includes(preferredWorkspaceId)) {
    return [
      preferredWorkspaceId,
      ...workspaceIds.filter(
        (workspaceId) => workspaceId !== preferredWorkspaceId,
      ),
    ];
  }

  return workspaceIds;
}

function getWorkspacePreferenceRank(
  workspaceId: string,
  workspaceIds: string[],
) {
  const index = workspaceIds.indexOf(workspaceId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function sortEmployeesByWorkspacePreference(
  employees: SelfServiceEmployeeIdentity[],
  workspaceIds: string[],
) {
  return employees.sort(
    (left, right) =>
      getWorkspacePreferenceRank(left.workspace_id, workspaceIds) -
      getWorkspacePreferenceRank(right.workspace_id, workspaceIds),
  );
}

async function getSelfServiceWorkspaceRoleId(params: {
  supabaseAdmin: any;
  workspaceId: string;
}) {
  const { data, error } = await params.supabaseAdmin
    .from('workspace_roles')
    .select('id, role_key, hierarchy_level')
    .eq('workspace_id', params.workspaceId)
    .eq('is_active', true);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const roles = (
    (data ?? []) as Array<{
      hierarchy_level?: number | null;
      id: string;
      role_key?: string | null;
    }>
  ).sort((left, right) => {
    const leftRank = left.role_key === 'user' ? 0 : 1;
    const rightRank = right.role_key === 'user' ? 0 : 1;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return (left.hierarchy_level ?? 0) - (right.hierarchy_level ?? 0);
  });

  if (!roles[0]?.id) {
    throw new ApiError(
      'Workspace role is required for self-service access',
      400,
    );
  }

  return roles[0].id;
}

async function ensureSelfServiceWorkspaceMembership(params: {
  supabaseAdmin: any;
  userId: string;
  workspaceId: string;
}) {
  const { data: member, error: memberError } = await params.supabaseAdmin
    .from('workspace_members')
    .select('id, role_id, status')
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.userId)
    .maybeSingle();

  if (memberError) {
    throw new ApiError(memberError.message, 400);
  }

  const existingMember = member as {
    id: string;
    role_id?: string | null;
    status?: string | null;
  } | null;

  if (existingMember?.status === 'accepted') {
    return;
  }

  if (existingMember?.status === 'removed') {
    throw new ApiError('Workspace membership is removed', 403);
  }

  const now = new Date().toISOString();

  if (existingMember?.id) {
    const { error } = await params.supabaseAdmin
      .from('workspace_members')
      .update({
        accepted_at: now,
        status: 'accepted',
      })
      .eq('id', existingMember.id);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return;
  }

  const roleId = await getSelfServiceWorkspaceRoleId({
    supabaseAdmin: params.supabaseAdmin,
    workspaceId: params.workspaceId,
  });

  const { error } = await params.supabaseAdmin
    .from('workspace_members')
    .insert({
      accepted_at: now,
      invited_at: now,
      role_id: roleId,
      status: 'accepted',
      user_id: params.userId,
      workspace_id: params.workspaceId,
    });

  if (error) {
    throw new ApiError(error.message, 400);
  }
}

async function getSelfServiceEmployee(params: {
  hrms: any;
  supabaseAdmin: any;
  user: unknown;
  userId: string;
  workspaceIds: string[];
}) {
  const { data: linkedEmployee, error: linkedEmployeeError } = await params.hrms
    .from('employees')
    .select('id, account_id, workspace_id')
    .eq('account_id', params.userId)
    .eq('is_deleted', false);

  if (linkedEmployeeError) {
    throw new ApiError(linkedEmployeeError.message, 400);
  }

  const linkedMatches = sortEmployeesByWorkspacePreference(
    (linkedEmployee ?? []) as SelfServiceEmployeeIdentity[],
    params.workspaceIds,
  );

  if (linkedMatches[0]?.id) {
    return linkedMatches[0];
  }

  const accountEmail = await getAccountEmail({
    supabaseAdmin: params.supabaseAdmin,
    user: params.user,
    userId: params.userId,
  });

  if (!accountEmail) {
    return null;
  }

  const { data: employeesByEmail, error: employeesByEmailError } =
    await params.hrms
      .from('employees')
      .select('id, account_id, work_email, workspace_id')
      .ilike('work_email', escapeIlikePattern(accountEmail))
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

  if (employeesByEmailError) {
    throw new ApiError(employeesByEmailError.message, 400);
  }

  const matches = sortEmployeesByWorkspacePreference(
    ((employeesByEmail ?? []) as SelfServiceEmployeeIdentity[]).filter(
      (employee) => normalizeEmail(employee.work_email) === accountEmail,
    ),
    params.workspaceIds,
  );

  const employee = matches[0] ?? null;

  if (!employee) {
    return null;
  }

  if (employee.account_id && employee.account_id !== params.userId) {
    throw new ApiError(
      'Employee email is already linked to another account',
      409,
    );
  }

  if (!employee.account_id) {
    await ensureSelfServiceWorkspaceMembership({
      supabaseAdmin: params.supabaseAdmin,
      userId: params.userId,
      workspaceId: employee.workspace_id,
    });

    const { data: updatedEmployee, error: updateEmployeeError } =
      await params.hrms
        .from('employees')
        .update({
          account_id: params.userId,
          updated_by: params.userId,
        })
        .eq('workspace_id', employee.workspace_id)
        .eq('id', employee.id)
        .is('account_id', null)
        .select('id, account_id, workspace_id')
        .single();

    if (updateEmployeeError) {
      throw new ApiError(updateEmployeeError.message, 400);
    }

    return updatedEmployee as SelfServiceEmployeeIdentity;
  }

  await ensureSelfServiceWorkspaceMembership({
    supabaseAdmin: params.supabaseAdmin,
    userId: params.userId,
    workspaceId: employee.workspace_id,
  });

  return employee;
}

function getEmployeeNameParts(account: AccountProfile) {
  const emailPrefix = account.email?.split('@')[0]?.replace(/[._-]+/g, ' ');
  const normalizedName =
    normalizeText(account.name) ?? emailPrefix ?? 'Employee';
  const [firstName = 'Employee', ...lastNameParts] =
    normalizedName.split(/\s+/);

  return {
    firstName,
    lastName: lastNameParts.join(' ') || null,
  };
}

function buildEmployeeCode(userId: string) {
  return `EMP-${userId.replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

async function createSelfServiceEmployee(params: {
  hrms: any;
  supabaseAdmin: any;
  user: unknown;
  userId: string;
  workspaceIds: string[];
}) {
  const workspaceId = params.workspaceIds[0];

  if (!workspaceId) {
    throw new ApiError('Workspace not found for user', 404);
  }

  const account = await getAccountProfile({
    supabaseAdmin: params.supabaseAdmin,
    user: params.user,
    userId: params.userId,
  });

  if (!account.email) {
    throw new ApiError('Account email is required for self-service', 400);
  }

  const { firstName, lastName } = getEmployeeNameParts(account);
  const { data, error } = await params.hrms
    .from('employees')
    .insert({
      account_id: params.userId,
      created_by: params.userId,
      employee_code: buildEmployeeCode(params.userId),
      employment_type: 'full_time',
      first_name: firstName,
      last_name: lastName,
      status: 'active',
      updated_by: params.userId,
      work_email: account.email,
      workspace_id: workspaceId,
    })
    .select('id, account_id, workspace_id')
    .single();

  if (error) {
    if (
      typeof error.message === 'string' &&
      error.message.toLowerCase().includes('duplicate')
    ) {
      return getSelfServiceEmployee({
        hrms: params.hrms,
        supabaseAdmin: params.supabaseAdmin,
        user: params.user,
        userId: params.userId,
        workspaceIds: params.workspaceIds,
      });
    }

    throw new ApiError(error.message, 400);
  }

  return data as SelfServiceEmployeeIdentity;
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-IN', {
    currency: 'INR',
    maximumFractionDigits: 2,
    style: 'currency',
  }).format(value ?? 0);
}

async function getSelfServiceContext(params: {
  request: Request;
  user: unknown;
}): Promise<SelfServiceContext> {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const userId = getRouteUserId(params.user);

  if (!userId) {
    throw new ApiError('Unauthorized', 401);
  }

  const workspaceIds = await getAcceptedWorkspaceIds({
    request: params.request,
    supabaseAdmin,
    userId,
  });

  const hrms = getHrmsClient(supabaseAdmin);
  const employee =
    (await getSelfServiceEmployee({
      hrms,
      supabaseAdmin,
      user: params.user,
      userId,
      workspaceIds,
    })) ??
    (await createSelfServiceEmployee({
      hrms,
      supabaseAdmin,
      user: params.user,
      userId,
      workspaceIds,
    }));

  if (!employee?.id) {
    throw new ApiError('Employee record not found for the current user', 404);
  }

  const workspaceId = employee.workspace_id;

  await ensureSelfServiceWorkspaceMembership({
    supabaseAdmin,
    userId,
    workspaceId,
  });

  await requireEmployeePermission({
    featureKey: 'view',
    minAccessLevel: 'own',
    moduleKey,
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const [canUpdateProfile, canCreateRequest, canDownloadPayslip] =
    await Promise.all([
      hasSelfServicePermission({
        featureKey: 'update_profile',
        supabaseAdmin,
        userId,
        workspaceId,
      }),
      hasSelfServicePermission({
        featureKey: 'create_request',
        supabaseAdmin,
        userId,
        workspaceId,
      }),
      hasSelfServicePermission({
        featureKey: 'download_payslip',
        supabaseAdmin,
        userId,
        workspaceId,
      }),
    ]);

  return {
    accessLevel: 'own',
    canCreateRequest,
    canDownloadPayslip,
    canUpdateProfile,
    employeeId: employee.id,
    hrms,
    supabaseAdmin,
    userId,
    workspaceId,
  };
}

async function getEmployeeProfile(context: SelfServiceContext) {
  const { data: employee, error } = await context.hrms
    .from('employees')
    .select(
      `
      id,
      employee_code,
      first_name,
      last_name,
      work_email,
      personal_email,
      phone,
      address,
      emergency_contact_name,
      emergency_contact_phone,
      designation,
      joining_date,
      manager_employee_id,
      department:departments!employees_department_id_fkey(id, name, code)
    `,
    )
    .eq('workspace_id', context.workspaceId)
    .eq('id', context.employeeId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!employee) {
    throw new ApiError('Employee profile not found', 404);
  }

  let managerName: string | null = null;

  if (employee.manager_employee_id) {
    const { data: manager, error: managerError } = await context.hrms
      .from('employees')
      .select('first_name, last_name')
      .eq('workspace_id', context.workspaceId)
      .eq('id', employee.manager_employee_id)
      .maybeSingle();

    if (managerError) {
      throw new ApiError(managerError.message, 400);
    }

    if (manager) {
      managerName = [manager.first_name, manager.last_name]
        .filter(Boolean)
        .join(' ');
    }
  }

  return {
    address: employee.address ?? null,
    department: employee.department ?? null,
    designation: employee.designation ?? null,
    emergency_contact_name: employee.emergency_contact_name ?? null,
    emergency_contact_phone: employee.emergency_contact_phone ?? null,
    employee_code: employee.employee_code,
    first_name: employee.first_name,
    id: employee.id,
    joining_date: employee.joining_date ?? null,
    last_name: employee.last_name ?? null,
    manager_name: managerName,
    personal_email: employee.personal_email ?? null,
    phone: employee.phone ?? null,
    work_email: employee.work_email,
  };
}

async function getPayslipDetail(params: {
  context: SelfServiceContext;
  payslipId: string;
}) {
  const { data: payslip, error: payslipError } = await params.context.hrms
    .from('payslips')
    .select(
      `
      id,
      employee_id,
      status,
      gross_salary,
      deductions,
      employer_contributions,
      net_salary,
      generated_at,
      published_at,
      payroll_run:payroll_runs(
        id,
        name,
        period_start,
        period_end,
        payment_date
      ),
      employee:employees(
        employee_code,
        first_name,
        last_name
      )
    `,
    )
    .eq('workspace_id', params.context.workspaceId)
    .eq('employee_id', params.context.employeeId)
    .eq('id', params.payslipId)
    .maybeSingle();

  if (payslipError) {
    throw new ApiError(payslipError.message, 400);
  }

  if (!payslip) {
    throw new ApiError('Payslip not found', 404);
  }

  const { data: components, error: componentsError } = await params.context.hrms
    .from('payslip_components')
    .select(
      `
      id,
      amount,
      quantity,
      rate,
      is_taxable,
      is_employer_side,
      display_order,
      source,
      salary_component:salary_components(
        id,
        code,
        name,
        type
      )
    `,
    )
    .eq('workspace_id', params.context.workspaceId)
    .eq('payslip_id', params.payslipId)
    .order('display_order', { ascending: true });

  if (componentsError) {
    throw new ApiError(componentsError.message, 400);
  }

  const employeeName = [
    payslip.employee?.first_name,
    payslip.employee?.last_name,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    components: components ?? [],
    payslip: {
      deductions: payslip.deductions,
      employee_code: payslip.employee?.employee_code ?? null,
      employee_id: payslip.employee_id,
      employee_name: employeeName || 'Employee',
      employer_contributions: payslip.employer_contributions,
      generated_at: payslip.generated_at,
      gross_salary: payslip.gross_salary,
      id: payslip.id,
      net_salary: payslip.net_salary,
      payroll_run: payslip.payroll_run,
      published_at: payslip.published_at,
      status: payslip.status,
    },
  };
}

function buildPayslipText(
  detail: Awaited<ReturnType<typeof getPayslipDetail>>,
) {
  const lines = [
    `Payslip`,
    ``,
    `Employee: ${detail.payslip.employee_name}`,
    `Employee Code: ${detail.payslip.employee_code ?? '-'}`,
    `Payroll Period: ${detail.payslip.payroll_run?.name ?? 'Current cycle'}`,
    `Generated At: ${detail.payslip.generated_at}`,
    `Published At: ${detail.payslip.published_at ?? '-'}`,
    ``,
    `Gross Salary: ${formatCurrency(detail.payslip.gross_salary)}`,
    `Deductions: ${formatCurrency(detail.payslip.deductions)}`,
    `Employer Contributions: ${formatCurrency(detail.payslip.employer_contributions)}`,
    `Net Salary: ${formatCurrency(detail.payslip.net_salary)}`,
    ``,
    `Components`,
    ...detail.components.map((component: any) => {
      const kind = component.salary_component?.type ?? 'component';
      const name = component.salary_component?.name ?? 'Unnamed component';

      return `- [${kind}] ${name}: ${formatCurrency(component.amount)}`;
    }),
  ];

  return lines.join('\n');
}

export {
  buildPayslipText,
  formatCurrency,
  getEmployeeProfile,
  getPayslipDetail,
  getSelfServiceContext,
  hasSelfServicePermission,
  normalizeText,
};
export type { SelfServiceContext };
