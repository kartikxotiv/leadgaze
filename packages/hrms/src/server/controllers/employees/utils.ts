import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError } from '../../../utils/response-handler';

export type EmployeeEmploymentType =
  | 'full_time'
  | 'part_time'
  | 'contract'
  | 'intern';

export type EmployeeStatus =
  | 'invited'
  | 'active'
  | 'probation'
  | 'notice_period'
  | 'inactive'
  | 'exited';

export type EmployeeBody = {
  account_id?: string | null;
  department_id?: string | null;
  shift_id?: string | null;
  designation?: string | null;
  employee_code?: string | null;
  employment_type?: EmployeeEmploymentType;
  first_name?: string | null;
  invite_if_missing?: boolean;
  joining_date?: string | null;
  last_name?: string | null;
  manager_employee_id?: string | null;
  phone?: string | null;
  role_id?: string | null;
  status?: EmployeeStatus;
  work_email?: string | null;
};

function normalizeNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function getEmployeeId(params?: Record<string, string>) {
  const employeeId = params?.employeeId;

  if (!employeeId) {
    throw new ApiError('Employee id is required', 400);
  }

  return employeeId;
}

async function validateEmployeeReferences(params: {
  accountId?: string | null;
  departmentId?: string | null;
  employeeId?: string;
  managerEmployeeId?: string | null;
  shiftId?: string | null;
  workspaceId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = (supabaseAdmin as any).schema('hrms') as any;

  if (params.departmentId) {
    const { data, error } = await hrms
      .from('departments')
      .select('id')
      .eq('id', params.departmentId)
      .eq('workspace_id', params.workspaceId)
      .maybeSingle();

    if (error || !data) {
      throw new ApiError('Department is invalid', 400);
    }
  }

  if (params.managerEmployeeId) {
    if (params.employeeId && params.employeeId === params.managerEmployeeId) {
      throw new ApiError('Employee cannot report to themselves', 400);
    }

    const { data, error } = await hrms
      .from('employees')
      .select('id, status')
      .eq('id', params.managerEmployeeId)
      .eq('workspace_id', params.workspaceId)
      .maybeSingle();

    if (error || !data || (data as { status: string }).status === 'invited') {
      throw new ApiError('Manager is invalid', 400);
    }
  }

  if (params.accountId) {
    const { data, error } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('id', params.accountId)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      throw new ApiError('Account not found', 400);
    }

    const { data: member, error: memberError } = await supabaseAdmin
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', params.workspaceId)
      .eq('user_id', params.accountId)
      .eq('status', 'accepted')
      .maybeSingle();

    if (memberError || !member) {
      throw new ApiError('Account is not part of this workspace', 400);
    }
  }

  if (params.shiftId) {
    const { data, error } = await hrms
      .from('shifts')
      .select('id')
      .eq('id', params.shiftId)
      .eq('workspace_id', params.workspaceId)
      .maybeSingle();

    if (error || !data) {
      throw new ApiError('Shift is invalid', 400);
    }
  }
}

async function findWorkspaceAccountByEmail(params: {
  email: string;
  workspaceId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const normalizedEmail = params.email.trim().toLowerCase();

  const { data: account, error } = await supabaseAdmin
    .from('accounts')
    .select('id, name, email')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!account) {
    return null;
  }

  const { data: member, error: memberError } = await supabaseAdmin
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', account.id)
    .eq('status', 'accepted')
    .maybeSingle();

  if (memberError) {
    throw new ApiError(memberError.message, 400);
  }

  return member ? account : null;
}

async function ensureUniqueEmployeeForAccount(params: {
  accountId: string;
  employeeId?: string;
  workspaceId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = (supabaseAdmin as any).schema('hrms') as any;

  let query = hrms
    .from('employees')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('account_id', params.accountId)
    .limit(1);

  if (params.employeeId) {
    query = query.neq('id', params.employeeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (data) {
    throw new ApiError('An employee already exists for this account', 400);
  }
}

async function ensureUniqueEmployeeEmail(params: {
  employeeId?: string;
  workEmail: string;
  workspaceId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = (supabaseAdmin as any).schema('hrms') as any;
  const normalizedEmail = params.workEmail.trim().toLowerCase();

  const { data, error } = await hrms
    .from('employees')
    .select('id, work_email')
    .eq('workspace_id', params.workspaceId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const duplicate = (
    data as Array<{ id: string; work_email: string }> | null
  )?.find((employee) => {
    const sameRecord = params.employeeId && employee.id === params.employeeId;

    return !sameRecord && employee.work_email.toLowerCase() === normalizedEmail;
  });

  if (duplicate) {
    throw new ApiError('An employee already exists with this work email', 400);
  }
}

export {
  ensureUniqueEmployeeEmail,
  ensureUniqueEmployeeForAccount,
  findWorkspaceAccountByEmail,
  getEmployeeId,
  normalizeNullable,
  validateEmployeeReferences,
};
