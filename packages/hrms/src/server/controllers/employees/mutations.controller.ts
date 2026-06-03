import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  type EmployeeRow,
  buildEmployeeInsertPayload,
  buildEmployeeUpdatePayload,
  enrichEmployees,
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
  syncEmployeeRole,
} from './controller.helpers';
import {
  type EmployeeBody,
  ensureUniqueEmployeeEmail,
  ensureUniqueEmployeeForAccount,
  findWorkspaceAccountByEmail,
  getEmployeeId,
  normalizeNullable,
  validateEmployeeReferences,
} from './utils';

const createEmployeeController = catchAsync(async ({ body, request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });
  const employeeBody = body as EmployeeBody;

  await requireEmployeePermission({
    featureKey: employeeBody.invite_if_missing ? 'invite' : 'create',
    minAccessLevel: 'team',
    supabaseAdmin,
    userId,
    workspaceId,
  });

  if (employeeBody.role_id) {
    await requireEmployeePermission({
      featureKey: 'assign_roles',
      minAccessLevel: 'team',
      supabaseAdmin,
      userId,
      workspaceId,
    });
  }

  const workEmail = employeeBody.work_email?.trim().toLowerCase();

  if (!workEmail) {
    throw new ApiError('Work email is required', 400);
  }

  const existingWorkspaceAccount = employeeBody.account_id
    ? null
    : await findWorkspaceAccountByEmail({
        email: workEmail,
        workspaceId,
      });
  const accountId =
    employeeBody.account_id ?? existingWorkspaceAccount?.id ?? null;

  await validateEmployeeReferences({
    accountId,
    departmentId: normalizeNullable(employeeBody.department_id),
    managerEmployeeId: normalizeNullable(employeeBody.manager_employee_id),
    shiftId: normalizeNullable(employeeBody.shift_id),
    workspaceId,
  });

  if (accountId) {
    await ensureUniqueEmployeeForAccount({
      accountId,
      workspaceId,
    });
  }

  await ensureUniqueEmployeeEmail({
    workspaceId,
    workEmail,
  });

  let invitedAt: string | null = null;
  let status = employeeBody.status ?? 'active';

  if (!accountId) {
    if (employeeBody.invite_if_missing === false) {
      throw new ApiError('User is not part of this workspace', 400);
    }

    const { error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(workEmail, {
        data: {
          name: [
            employeeBody.first_name?.trim(),
            employeeBody.last_name?.trim(),
          ]
            .filter(Boolean)
            .join(' '),
        },
        redirectTo: `${getAppUrl()}/home/hrms/employees`,
      });

    if (inviteError) {
      throw new ApiError(inviteError.message, 400);
    }

    invitedAt = new Date().toISOString();
    status = 'invited';
  }

  const payload = buildEmployeeInsertPayload({
    accountId,
    employeeBody,
    invitedAt,
    status,
    userId,
    workspaceId,
  });

  const { data, error } = await hrms
    .from('employees')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  await syncEmployeeRole({
    employeeId: data.id,
    roleId: employeeBody.role_id,
    supabaseAdmin,
    userId,
    workspaceId,
  });

  if (status === 'invited') {
    const { error: invitedError } = await hrms
      .from('invited_employees')
      .insert({
        workspace_id: workspaceId,
        employee_id: data.id,
        invited_email: workEmail,
        status: 'invited',
        created_by: userId,
        updated_by: userId,
      });

    if (invitedError) {
      throw new ApiError(invitedError.message, 400);
    }
  }

  const [employee] = await enrichEmployees({
    employees: [data as EmployeeRow],
    supabaseAdmin,
    workspaceId,
  });

  return successDataResponse('Employee created successfully', employee);
});

const updateEmployeeController = catchAsync(
  async ({ body, params, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);
    const userId = getRouteUserId(user);
    const workspaceId = await getRequiredWorkspaceId({
      request,
      supabaseAdmin,
      userId,
    });
    const employeeId = getEmployeeId(params);
    const employeeBody = body as EmployeeBody;

    await requireEmployeePermission({
      featureKey: 'edit',
      minAccessLevel: 'team',
      supabaseAdmin,
      userId,
      workspaceId,
    });

    if (employeeBody.role_id !== undefined) {
      await requireEmployeePermission({
        featureKey: 'assign_roles',
        minAccessLevel: 'team',
        supabaseAdmin,
        userId,
        workspaceId,
      });
    }

    const { data: existingEmployee, error: existingEmployeeError } = await hrms
      .from('employees')
      .select('id, account_id, work_email')
      .eq('workspace_id', workspaceId)
      .eq('id', employeeId)
      .eq('is_deleted', false)
      .single();

    if (existingEmployeeError || !existingEmployee) {
      throw new ApiError('Employee not found', 404);
    }

    const nextAccountId =
      employeeBody.account_id === undefined
        ? existingEmployee.account_id
        : employeeBody.account_id;
    const nextWorkEmail =
      employeeBody.work_email === undefined
        ? existingEmployee.work_email
        : (employeeBody.work_email ?? '').trim().toLowerCase();

    await validateEmployeeReferences({
      accountId: nextAccountId,
      departmentId:
        employeeBody.department_id === undefined
          ? undefined
          : normalizeNullable(employeeBody.department_id),
      employeeId,
      managerEmployeeId:
        employeeBody.manager_employee_id === undefined
          ? undefined
          : normalizeNullable(employeeBody.manager_employee_id),
      shiftId:
        employeeBody.shift_id === undefined
          ? undefined
          : normalizeNullable(employeeBody.shift_id),
      workspaceId,
    });

    if (nextAccountId) {
      await ensureUniqueEmployeeForAccount({
        accountId: nextAccountId,
        employeeId,
        workspaceId,
      });
    }

    await ensureUniqueEmployeeEmail({
      employeeId,
      workspaceId,
      workEmail: nextWorkEmail,
    });

    const payload = buildEmployeeUpdatePayload({
      employeeBody,
      nextWorkEmail,
      userId,
    });

    const { data, error } = await hrms
      .from('employees')
      .update(payload)
      .eq('workspace_id', workspaceId)
      .eq('id', employeeId)
      .eq('is_deleted', false)
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    await syncEmployeeRole({
      employeeId,
      roleId: employeeBody.role_id,
      supabaseAdmin,
      userId,
      workspaceId,
    });

    const [employee] = await enrichEmployees({
      employees: [data as EmployeeRow],
      supabaseAdmin,
      workspaceId,
    });

    return successDataResponse('Employee updated successfully', employee);
  },
);

const deleteEmployeeController = catchAsync(
  async ({ params, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);
    const userId = getRouteUserId(user);
    const workspaceId = await getRequiredWorkspaceId({
      request,
      supabaseAdmin,
      userId,
    });
    const employeeId = getEmployeeId(params);

    await requireEmployeePermission({
      featureKey: 'delete',
      minAccessLevel: 'team',
      supabaseAdmin,
      userId,
      workspaceId,
    });

    const { data: employee, error: employeeError } = await hrms
      .from('employees')
      .select('id, status')
      .eq('workspace_id', workspaceId)
      .eq('id', employeeId)
      .eq('is_deleted', false)
      .single();

    if (employeeError || !employee) {
      throw new ApiError('Employee not found', 404);
    }

    if (employee.status !== 'invited') {
      throw new ApiError('Only invited employees can be deleted', 400);
    }

    const { error: deleteInviteError } = await hrms
      .from('invited_employees')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('employee_id', employeeId);

    if (deleteInviteError) {
      throw new ApiError(deleteInviteError.message, 400);
    }

    const { error } = await hrms
      .from('employees')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', employeeId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Employee deleted successfully');
  },
);

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL ||
    'http://localhost:3000'
  );
}

export {
  createEmployeeController,
  deleteEmployeeController,
  updateEmployeeController,
};
