import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requirePermission } from '~/lib/server/rbac';
import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';

import {
  ensureEmployeeInOrganization,
  ensurePayrollRunInOrganization,
  getRequiredOrganizationId,
  BaseSeparationItem,
  ExtendedDatabase,
} from '../separation/utils';

type FnfSettlementBody = {
  employee_id: string;
  payroll_run_id?: string | null;
  last_working_day: string;
  components?: unknown[];
  leave_encashment?: number;
  gratuity?: number;
  notice_recovery?: number;
  total_payable?: number;
  tds_on_fnf?: number;
  net_payable?: number;
  status?: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PAID' | 'REJECTED';
  remarks?: string | null;
  settlement_date?: string | null;
};

const fnfSettlementSelect = `
  id,
  employee_id,
  payroll_run_id,
  last_working_day,
  components,
  leave_encashment,
  gratuity,
  notice_recovery,
  total_payable,
  tds_on_fnf,
  net_payable,
  status,
  settlement_date,
  created_at,
  updated_at,
  employee:employees!fnf_settlements_employee_id_fkey!inner(
    id,
    first_name,
    last_name,
    employee_code,
    organization_id
  )
`;

const listFnfSettlementsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_fnf',
    minAccessLevel: 'team',
  });

  const { data, error } = await supabaseAdmin
    .from('fnf_settlements')
    .select(fnfSettlementSelect)
    .eq('employee.organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const items = (data as unknown as BaseSeparationItem[]) ?? [];
  const rows = items.map((item) => {
    const next = { ...item };

    if (next.employee?.organization_id) {
      delete next.employee.organization_id;
    }

    return next;
  });

  return successDataResponse('FnF settlements fetched successfully', rows);
});

const getFnfSettlementController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const settlementId = params?.id;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_fnf',
    minAccessLevel: 'team',
  });

  if (!settlementId) {
    throw new ApiError('FnF settlement id is required', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('fnf_settlements')
    .select(fnfSettlementSelect)
    .eq('id', settlementId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('FnF settlement fetched successfully', result);
});

const createFnfSettlementController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const payload = body as FnfSettlementBody;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_fnf',
    minAccessLevel: 'team',
  });

  await ensureEmployeeInOrganization({
    employeeId: payload.employee_id,
    organizationId,
  });

  if (payload.payroll_run_id) {
    await ensurePayrollRunInOrganization({
      payrollRunId: payload.payroll_run_id,
      organizationId,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('fnf_settlements')
    .insert({
      employee_id: payload.employee_id,
      payroll_run_id: payload.payroll_run_id ?? null,
      last_working_day: payload.last_working_day,
      components: payload.components ?? [],
      leave_encashment: payload.leave_encashment ?? 0,
      gratuity: payload.gratuity ?? 0,
      notice_recovery: payload.notice_recovery ?? 0,
      total_payable: payload.total_payable ?? 0,
      tds_on_fnf: payload.tds_on_fnf ?? 0,
      net_payable: payload.net_payable ?? 0,
      status: payload.status ?? 'DRAFT',
      settlement_date: payload.settlement_date ?? null,
    })
    .select(fnfSettlementSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('FnF settlement created successfully', result);
});

const updateFnfSettlementController = catchAsync(async ({ body, params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const settlementId = params?.id;
  const payload = body as Partial<FnfSettlementBody>;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_fnf',
    minAccessLevel: 'team',
  });

  if (!settlementId) {
    throw new ApiError('FnF settlement id is required', 400);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('fnf_settlements')
    .select('id, employee_id, employee:employees!fnf_settlements_employee_id_fkey!inner(id, organization_id)')
    .eq('id', settlementId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(existingError.message, 400);
  }

  if (!existing) {
    throw new ApiError('FnF settlement not found', 404);
  }

  if (payload.employee_id) {
    await ensureEmployeeInOrganization({
      employeeId: payload.employee_id,
      organizationId,
    });
  }

  if (payload.payroll_run_id) {
    await ensurePayrollRunInOrganization({
      payrollRunId: payload.payroll_run_id,
      organizationId,
    });
  }

  const { data, error } = await supabaseAdmin
    .from('fnf_settlements')
    .update({
      employee_id: payload.employee_id,
      payroll_run_id: payload.payroll_run_id,
      last_working_day: payload.last_working_day,
      components: payload.components,
      leave_encashment: payload.leave_encashment,
      gratuity: payload.gratuity,
      notice_recovery: payload.notice_recovery,
      total_payable: payload.total_payable,
      tds_on_fnf: payload.tds_on_fnf,
      net_payable: payload.net_payable,
      status: payload.status,
      remarks: payload.remarks,
      settlement_date: payload.settlement_date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', settlementId)
    .select(fnfSettlementSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('FnF settlement updated successfully', result);
});

const deleteFnfSettlementController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const settlementId = params?.id;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_fnf',
    minAccessLevel: 'team',
  });

  if (!settlementId) {
    throw new ApiError('FnF settlement id is required', 400);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('fnf_settlements')
    .select('id, employee:employees!fnf_settlements_employee_id_fkey!inner(id, organization_id)')
    .eq('id', settlementId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(existingError.message, 400);
  }

  if (!existing) {
    throw new ApiError('FnF settlement not found', 404);
  }

  const { error } = await supabaseAdmin
    .from('fnf_settlements')
    .delete()
    .eq('id', settlementId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('FnF settlement deleted successfully', null);
});

export {
  createFnfSettlementController,
  deleteFnfSettlementController,
  getFnfSettlementController,
  listFnfSettlementsController,
  updateFnfSettlementController,
};
