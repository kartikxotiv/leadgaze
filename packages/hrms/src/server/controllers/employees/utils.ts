import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { ApiError } from '~/utils/response-handler';

export type EmployeeBody = {
  account_id?: string | null;
  department_id?: string | null;
  shift_id?: string | null;
  designation?: string | null;
  employee_code?: string | null;
  employment_type?: Database['public']['Enums']['employee_employment_type'];
  first_name?: string | null;
  invite_if_missing?: boolean;
  joining_date?: string | null;
  last_name?: string | null;
  manager_employee_id?: string | null;
  phone?: string | null;
  role_id?: string | null;
  status?: Database['public']['Enums']['employee_status'];
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
  organizationId: string;
  shiftId?: string | null;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  if (params.departmentId) {
    const { data, error } = await supabaseAdmin
      .from('departments')
      .select('id')
      .eq('id', params.departmentId)
      .eq('organization_id', params.organizationId)
      .maybeSingle();

    if (error || !data) {
      throw new ApiError('Department is invalid', 400);
    }
  }

  if (params.managerEmployeeId) {
    if (params.employeeId && params.employeeId === params.managerEmployeeId) {
      throw new ApiError('Employee cannot report to themselves', 400);
    }

    const { data, error } = await supabaseAdmin
      .from('employees')
      .select('id, status')
      .eq('id', params.managerEmployeeId)
      .eq('organization_id', params.organizationId)
      .maybeSingle();

    if (error || !data || data.status === 'invited') {
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
  }

  if (params.shiftId) {
    const { data, error } = await supabaseAdmin
      .from('shifts')
      .select('id')
      .eq('id', params.shiftId)
      .eq('organization_id', params.organizationId)
      .maybeSingle();

    if (error || !data) {
      throw new ApiError('Shift is invalid', 400);
    }
  }
}

async function findOrganizationAccountByEmail(params: {
  email: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const normalizedEmail = params.email.trim().toLowerCase();

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select(
      'account_id, account:accounts!employees_account_id_fkey(id, name, email)',
    )
    .eq('organization_id', params.organizationId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return (
    data?.find(
      (entry) => entry.account?.email?.toLowerCase() === normalizedEmail,
    )?.account ?? null
  );
}

async function ensureUniqueEmployeeForAccount(params: {
  accountId: string;
  employeeId?: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  let query = supabaseAdmin
    .from('employees')
    .select('id')
    .eq('organization_id', params.organizationId)
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
  organizationId: string;
  workEmail: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const normalizedEmail = params.workEmail.trim().toLowerCase();

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id, work_email')
    .eq('organization_id', params.organizationId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const duplicate = data?.find((employee) => {
    const sameRecord = params.employeeId && employee.id === params.employeeId;

    return !sameRecord && employee.work_email.toLowerCase() === normalizedEmail;
  });

  if (duplicate) {
    throw new ApiError('An employee already exists with this work email', 400);
  }
}

async function removeEmployeeRoleFromAccount(params: {
  accountId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  const { data: employeeRole, error: employeeRoleError } = await supabaseAdmin
    .from('roles')
    .select('id')
    .eq('organization_id', params.organizationId)
    .eq('role_key', 'employee')
    .maybeSingle();

  if (employeeRoleError) {
    throw new ApiError(employeeRoleError.message, 400);
  }

  if (!employeeRole) {
    return;
  }

  const { error } = await supabaseAdmin
    .from('employee_roles')
    .delete()
    .eq('organization_id', params.organizationId)
    .eq('role_id', employeeRole.id)
    .eq('employee_id', params.accountId);

  if (error) {
    throw new ApiError(error.message, 400);
  }
}

export {
  ensureUniqueEmployeeEmail,
  ensureUniqueEmployeeForAccount,
  findOrganizationAccountByEmail,
  getEmployeeId,
  normalizeNullable,
  removeEmployeeRoleFromAccount,
  validateEmployeeReferences,
};
