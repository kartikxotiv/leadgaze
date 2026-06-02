import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  buildEmployeeOptions,
  getRequiredOrganizationId,
} from './controller.helpers';

const getEmployeeOptionsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getRequiredOrganizationId(user?.id);

  const [
    { data: departments, error: departmentsError },
    { data: employees, error: employeesError },
    { data: accounts, error: accountsError },
    { data: roles, error: rolesError },
    { data: employeeRoles, error: employeeRolesError },
    { data: shifts, error: shiftsError },
  ] = await Promise.all([
    supabaseAdmin
      .from('departments')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_code, account_id, status')
      .eq('organization_id', organizationId)
      .neq('status', 'exited')
      .order('first_name', { ascending: true }),
    supabaseAdmin
      .from('accounts')
      .select('id, name, email')
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('roles')
      .select('id, role_name, role_key')
      .eq('organization_id', organizationId)
      .order('hierarchy_level', { ascending: false }),
    supabaseAdmin
      .from('employee_roles')
      .select('employee_id, role_id')
      .eq('organization_id', organizationId),
    supabaseAdmin
      .from('shifts')
      .select('id, name, is_active')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
  ]);

  if (departmentsError) {
    throw new ApiError(departmentsError.message, 400);
  }

  if (employeesError) {
    throw new ApiError(employeesError.message, 400);
  }

  if (accountsError) {
    throw new ApiError(accountsError.message, 400);
  }

  if (rolesError) {
    throw new ApiError(rolesError.message, 400);
  }

  if (employeeRolesError) {
    throw new ApiError(employeeRolesError.message, 400);
  }

  if (shiftsError) {
    throw new ApiError(shiftsError.message, 400);
  }

  return successDataResponse('Employee options fetched successfully', {
    ...buildEmployeeOptions({
      accounts,
      departments,
      employeeRoles,
      employees,
      roles,
      shifts,
    }),
  });
});

export { getEmployeeOptionsController };
