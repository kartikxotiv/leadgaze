import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { ApiError } from '~/utils/response-handler';

function normalizeNullable(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function getShiftId(params?: Record<string, string>) {
  const shiftId = params?.shiftId;

  if (!shiftId) {
    throw new ApiError('Shift id is required', 400);
  }

  return shiftId;
}

async function requireAdminRole(params: {
  accountId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  const { data: ownedOrg, error: ownedOrgError } = await supabaseAdmin
    .from('organizations')
    .select('id')
    .eq('id', params.organizationId)
    .eq('owner_id', params.accountId)
    .maybeSingle();

  if (ownedOrgError) {
    throw new ApiError(ownedOrgError.message, 400);
  }

  if (ownedOrg) {
    return;
  }

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('id')
    .eq('organization_id', params.organizationId)
    .eq('account_id', params.accountId)
    .maybeSingle();

  if (employeeError) {
    throw new ApiError(employeeError.message, 400);
  }

  if (!employee) {
    throw new ApiError('Forbidden', 403);
  }

  const { data, error } = await supabaseAdmin
    .from('employee_roles')
    .select('role:roles!employee_roles_role_id_fkey(role_key)')
    .eq('organization_id', params.organizationId)
    .eq('employee_id', employee.id);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const roleKeys = (data ?? [])
    .map((entry) => entry.role?.role_key)
    .filter((value): value is string => Boolean(value));

  const isAdmin =
    roleKeys.includes('admin') ||
    roleKeys.includes('hr_manager') ||
    roleKeys.includes('hr');

  if (!isAdmin) {
    throw new ApiError('Forbidden', 403);
  }
}

export { getShiftId, normalizeNullable, requireAdminRole };
