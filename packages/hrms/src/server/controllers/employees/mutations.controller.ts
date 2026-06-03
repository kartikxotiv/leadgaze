import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import appConfig from '~/config/app.config';
import type { Database } from '~/lib/database.types';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  attachEmployeeManagers,
  buildEmployeeInsertPayload,
  buildEmployeeUpdatePayload,
  employeeSelect,
  getRequiredOrganizationId,
  syncEmployeeRole,
} from './controller.helpers';
import {
  EmployeeBody,
  ensureUniqueEmployeeEmail,
  ensureUniqueEmployeeForAccount,
  findOrganizationAccountByEmail,
  getEmployeeId,
  normalizeNullable,
  removeEmployeeRoleFromAccount,
  validateEmployeeReferences,
} from './utils';

const createEmployeeController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const employeeBody = body as EmployeeBody;

  const workEmail = employeeBody.work_email?.trim().toLowerCase();

  if (!workEmail) {
    throw new ApiError('Work email is required', 400);
  }

  const existingOrganizationAccount = employeeBody.account_id
    ? null
    : await findOrganizationAccountByEmail({
        email: workEmail,
        organizationId,
      });

  const accountId =
    employeeBody.account_id ?? existingOrganizationAccount?.id ?? null;

  await validateEmployeeReferences({
    accountId,
    departmentId: normalizeNullable(employeeBody.department_id),
    managerEmployeeId: normalizeNullable(employeeBody.manager_employee_id),
    organizationId,
    shiftId: normalizeNullable(employeeBody.shift_id),
  });

  if (accountId) {
    await ensureUniqueEmployeeForAccount({
      accountId,
      organizationId,
    });
  }

  await ensureUniqueEmployeeEmail({
    organizationId,
    workEmail,
  });

  let invitedAt: string | null = null;
  let status: Database['public']['Enums']['employee_status'] =
    employeeBody.status ?? 'active';

  if (!accountId) {
    if (employeeBody.invite_if_missing === false) {
      throw new ApiError('User is not part of the organization', 400);
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
        redirectTo: `${appConfig.url}/home/employes`,
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
    organizationId,
    status,
    userId: user?.id,
  });

  const { data, error } = await supabaseAdmin
    .from('employees')
    .insert(payload)
    .select(employeeSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  await syncEmployeeRole({
    employeeId: data.id,
    organizationId,
    roleId: employeeBody.role_id,
    supabaseAdmin,
    userId: user?.id,
  });

  const [employee] = await attachEmployeeManagers({
    employees: [
      {
        ...data,
        role_id: employeeBody.role_id ?? null,
      },
    ],
    organizationId,
    supabaseAdmin,
  });

  return successDataResponse('Employee created successfully', employee);
});

const updateEmployeeController = catchAsync(async ({ body, params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const employeeId = getEmployeeId(params);
  const employeeBody = body as EmployeeBody;

  const { data: existingEmployee, error: existingEmployeeError } =
    await supabaseAdmin
      .from('employees')
      .select('id, account_id, work_email')
      .eq('organization_id', organizationId)
      .eq('id', employeeId)
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
    organizationId,
    shiftId:
      employeeBody.shift_id === undefined
        ? undefined
        : normalizeNullable(employeeBody.shift_id),
  });

  if (nextAccountId) {
    await ensureUniqueEmployeeForAccount({
      accountId: nextAccountId,
      employeeId,
      organizationId,
    });
  }

  await ensureUniqueEmployeeEmail({
    employeeId,
    organizationId,
    workEmail: nextWorkEmail,
  });

  const payload = buildEmployeeUpdatePayload({
    employeeBody,
    nextWorkEmail,
    userId: user?.id,
  });

  const { data, error } = await supabaseAdmin
    .from('employees')
    .update(payload)
    .eq('organization_id', organizationId)
    .eq('id', employeeId)
    .select(employeeSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  await syncEmployeeRole({
    employeeId,
    organizationId,
    roleId: employeeBody.role_id,
    supabaseAdmin,
    userId: user?.id,
  });

  const [employee] = await attachEmployeeManagers({
    employees: [
      {
        ...data,
        role_id:
          employeeBody.role_id ?? data.employee_roles?.[0]?.role_id ?? null,
      },
    ],
    organizationId,
    supabaseAdmin,
  });

  return successDataResponse('Employee updated successfully', employee);
});

const deleteEmployeeController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const employeeId = getEmployeeId(params);

  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('account_id, status')
    .eq('status', 'invited')
    .eq('organization_id', organizationId)
    .eq('id', employeeId)
    .single();

  if (employeeError || !employee) {
    throw new ApiError('Employee not found', 404);
  }

  const { error: deleteInviteError } = await supabaseAdmin
    .from('invited_employees')
    .delete()
    .eq('organization_id', organizationId)
    .eq('employee_id', employeeId);

  if (deleteInviteError) {
    throw new ApiError(deleteInviteError.message, 400);
  }

  const { error } = await supabaseAdmin
    .from('employees')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', employeeId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (employee.account_id) {
    await removeEmployeeRoleFromAccount({
      accountId: employee.account_id,
      organizationId,
    });
    const { error: deleteAccountError } = await supabaseAdmin
      .from('accounts')
      .delete()
      .eq('id', employee.account_id);

    if (deleteAccountError) {
      throw new ApiError(deleteAccountError.message, 400);
    }

    const { error: deleteAuthUserError } =
      await supabaseAdmin.auth.admin.deleteUser(employee.account_id);
    if (deleteAuthUserError) {
      throw new ApiError(deleteAuthUserError.message, 400);
    }
  }

  return successDataResponse('Employee deleted successfully');
});

export {
  createEmployeeController,
  deleteEmployeeController,
  updateEmployeeController,
};
