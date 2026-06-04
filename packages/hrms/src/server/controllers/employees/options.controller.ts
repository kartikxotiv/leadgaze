import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  buildEmployeeOptions,
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from './controller.helpers';

const getEmployeeOptionsController = catchAsync(async ({ request, user }) => {
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

  const [
    { data: departments, error: departmentsError },
    { data: employees, error: employeesError },
    { data: workspaceMembers, error: workspaceMembersError },
    { data: roles, error: rolesError },
    { data: employeeRoles, error: employeeRolesError },
    { data: shifts, error: shiftsError },
  ] = await Promise.all([
    hrms
      .from('departments')
      .select('id, name, code')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    hrms
      .from('employees')
      .select('id, first_name, last_name, employee_code, account_id, status')
      .eq('workspace_id', workspaceId)
      .eq('is_deleted', false)
      .neq('status', 'exited')
      .order('first_name', { ascending: true }),
    supabaseAdmin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', workspaceId)
      .eq('status', 'accepted'),
    supabaseAdmin
      .from('workspace_roles')
      .select('id, role_name, role_key')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .order('hierarchy_level', { ascending: false }),
    hrms
      .from('employee_roles')
      .select('employee_id, role_id')
      .eq('workspace_id', workspaceId),
    hrms
      .from('shifts')
      .select('id, name, is_active')
      .eq('workspace_id', workspaceId)
      .order('name', { ascending: true }),
  ]);

  for (const result of [
    { error: departmentsError },
    { error: employeesError },
    { error: workspaceMembersError },
    { error: rolesError },
    { error: employeeRolesError },
    { error: shiftsError },
  ]) {
    if (result.error) {
      throw new ApiError(result.error.message, 400);
    }
  }

  const accountIds = (workspaceMembers ?? [])
    .map((member: { user_id: string | null }) => member.user_id)
    .filter((value: string | null): value is string => Boolean(value));

  const { data: accounts, error: accountsError } =
    accountIds.length > 0
      ? await supabaseAdmin
          .from('accounts')
          .select('id, name, email')
          .in('id', accountIds)
          .order('name', { ascending: true })
      : { data: [], error: null };

  if (accountsError) {
    throw new ApiError(accountsError.message, 400);
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
