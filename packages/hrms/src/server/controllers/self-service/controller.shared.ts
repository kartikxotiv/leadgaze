/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError } from '../../../utils/response-handler';
import {
  getHrmsClient,
  getRequiredWorkspaceId,
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

  const workspaceId = await getRequiredWorkspaceId({
    request: params.request as any,
    supabaseAdmin,
    userId,
  });

  await requireEmployeePermission({
    featureKey: 'view',
    minAccessLevel: 'own',
    moduleKey,
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const hrms = getHrmsClient(supabaseAdmin);
  const { data: employee, error: employeeError } = await hrms
    .from('employees')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('account_id', userId)
    .eq('is_deleted', false)
    .limit(1)
    .maybeSingle();

  if (employeeError) {
    throw new ApiError(employeeError.message, 400);
  }

  if (!employee?.id) {
    throw new ApiError('Employee record not found for the current user', 404);
  }

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
