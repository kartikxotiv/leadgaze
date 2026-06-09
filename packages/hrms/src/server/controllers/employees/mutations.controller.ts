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
import {
  generateTemporaryPassword,
  sendEmployeeWelcomeEmail,
} from './welcome-email';

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

  const invitedAt: string | null = null;
  const status = 'active';
  let createdAccountId: string | null = null;
  let temporaryPassword: string | null = null;

  if (!accountId) {
    if (employeeBody.invite_if_missing === false) {
      throw new ApiError('User is not part of this workspace', 400);
    }

    temporaryPassword = generateTemporaryPassword();

    const { data: createdUser, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: workEmail,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          name: [
            employeeBody.first_name?.trim(),
            employeeBody.last_name?.trim(),
          ]
            .filter(Boolean)
            .join(' '),
        },
      });

    if (createUserError) {
      throw new ApiError(createUserError.message, 400);
    }

    if (!createdUser.user?.id) {
      throw new ApiError('Unable to create user account', 400);
    }

    createdAccountId = createdUser.user.id;

    await ensureWorkspaceMembership({
      accountId: createdAccountId,
      invitedBy: userId,
      roleId: employeeBody.role_id,
      supabaseAdmin,
      workspaceId,
    });
  }

  const payload = buildEmployeeInsertPayload({
    accountId: createdAccountId ?? accountId,
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

  try {
    await assignHrmsSeatToEmployee({
      assignedBy: userId,
      supabaseAdmin,
      userAccountId: createdAccountId ?? accountId,
      workspaceId,
    });
  } catch (seatError) {
    await hrms
      .from('invited_employees')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('employee_id', data.id);

    await hrms
      .from('employees')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('id', data.id);

    if (createdAccountId) {
      await cleanupGeneratedLoginAccount({
        accountId: createdAccountId,
        supabaseAdmin,
        workspaceId,
      });
    }

    throw seatError;
  }

  if (temporaryPassword) {
    try {
      await sendEmployeeWelcomeEmail({
        employeeBody,
        loginUrl: `${getAppUrl()}/auth/sign-in`,
        temporaryPassword,
        to: workEmail,
        workspaceName: await getWorkspaceName({
          supabaseAdmin,
          workspaceId,
        }),
      });
    } catch (emailError) {
      console.error('Failed to send employee welcome email:', emailError);
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
      .select('id, account_id, status')
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

    await revokeHrmsSeatForEmployee({
      revokedBy: userId,
      supabaseAdmin,
      userAccountId: employee.account_id,
      workspaceId,
    });

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

async function getWorkspaceName(params: {
  supabaseAdmin: any;
  workspaceId: string;
}) {
  const { data } = await params.supabaseAdmin
    .from('workspaces')
    .select('name')
    .eq('id', params.workspaceId)
    .maybeSingle();

  return (data as { name?: string } | null)?.name ?? null;
}

async function ensureWorkspaceMembership(params: {
  accountId: string;
  invitedBy?: string;
  roleId?: string | null;
  supabaseAdmin: any;
  workspaceId: string;
}) {
  const roleId =
    params.roleId ??
    (await getDefaultWorkspaceRoleId({
      supabaseAdmin: params.supabaseAdmin,
      workspaceId: params.workspaceId,
    }));

  if (!roleId) {
    throw new ApiError(
      'Workspace role is required to create login access',
      400,
    );
  }

  const now = new Date().toISOString();
  const { error } = await params.supabaseAdmin.from('workspace_members').upsert(
    {
      workspace_id: params.workspaceId,
      user_id: params.accountId,
      role_id: roleId,
      status: 'accepted',
      invited_by: params.invitedBy,
      invited_at: now,
      accepted_at: now,
    },
    {
      onConflict: 'workspace_id,user_id',
    },
  );

  if (error) {
    throw new ApiError(error.message, 400);
  }
}

async function getDefaultWorkspaceRoleId(params: {
  supabaseAdmin: any;
  workspaceId: string;
}) {
  const { data: userRole, error: userRoleError } = await params.supabaseAdmin
    .from('workspace_roles')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('role_key', 'user')
    .eq('is_active', true)
    .maybeSingle();

  if (userRoleError) {
    throw new ApiError(userRoleError.message, 400);
  }

  if ((userRole as { id?: string } | null)?.id) {
    return (userRole as { id: string }).id;
  }

  const { data: fallbackRole, error: fallbackRoleError } =
    await params.supabaseAdmin
      .from('workspace_roles')
      .select('id')
      .eq('workspace_id', params.workspaceId)
      .eq('is_active', true)
      .order('hierarchy_level', { ascending: true })
      .limit(1)
      .maybeSingle();

  if (fallbackRoleError) {
    throw new ApiError(fallbackRoleError.message, 400);
  }

  return (fallbackRole as { id?: string } | null)?.id ?? null;
}

async function assignHrmsSeatToEmployee(params: {
  assignedBy?: string;
  supabaseAdmin: any;
  userAccountId?: string | null;
  workspaceId: string;
}) {
  if (!params.userAccountId) {
    throw new ApiError(
      'Employee login account is required for HRMS access',
      400,
    );
  }

  const product = await getSubscriptionProductByKey({
    productKey: 'hrms',
    supabaseAdmin: params.supabaseAdmin,
  });

  const { data: activeAssignment, error: activeAssignmentError } =
    await params.supabaseAdmin
      .from('seat_assignments')
      .select('id')
      .eq('workspace_id', params.workspaceId)
      .eq('user_id', params.userAccountId)
      .eq('product_id', product.id)
      .eq('is_active', true)
      .maybeSingle();

  if (activeAssignmentError) {
    throw new ApiError(activeAssignmentError.message, 400);
  }

  if (activeAssignment) {
    return;
  }

  const seat = await getAvailableWorkspaceSeat({
    productId: product.id,
    supabaseAdmin: params.supabaseAdmin,
    workspaceId: params.workspaceId,
  });

  const { data: inactiveAssignment, error: inactiveAssignmentError } =
    await params.supabaseAdmin
      .from('seat_assignments')
      .select('id')
      .eq('workspace_id', params.workspaceId)
      .eq('user_id', params.userAccountId)
      .eq('product_id', product.id)
      .eq('is_active', false)
      .maybeSingle();

  if (inactiveAssignmentError) {
    throw new ApiError(inactiveAssignmentError.message, 400);
  }

  if (inactiveAssignment) {
    const { error } = await params.supabaseAdmin
      .from('seat_assignments')
      .update({
        is_active: true,
        seat_id: seat.id,
        assigned_at: new Date().toISOString(),
        assigned_by: params.assignedBy,
        revoked_at: null,
        revoked_by: null,
      })
      .eq('id', inactiveAssignment.id);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return;
  }

  const { error } = await params.supabaseAdmin.from('seat_assignments').insert({
    seat_id: seat.id,
    workspace_id: params.workspaceId,
    user_id: params.userAccountId,
    product_id: product.id,
    is_active: true,
    assigned_by: params.assignedBy,
  });

  if (error) {
    throw new ApiError(error.message, 400);
  }
}

async function revokeHrmsSeatForEmployee(params: {
  revokedBy?: string;
  supabaseAdmin: any;
  userAccountId?: string | null;
  workspaceId: string;
}) {
  if (!params.userAccountId) {
    return;
  }

  const product = await getSubscriptionProductByKey({
    productKey: 'hrms',
    supabaseAdmin: params.supabaseAdmin,
  });

  const { error } = await params.supabaseAdmin
    .from('seat_assignments')
    .update({
      is_active: false,
      revoked_at: new Date().toISOString(),
      revoked_by: params.revokedBy,
    })
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.userAccountId)
    .eq('product_id', product.id)
    .eq('is_active', true);

  if (error) {
    throw new ApiError(error.message, 400);
  }
}

async function getSubscriptionProductByKey(params: {
  productKey: string;
  supabaseAdmin: any;
}) {
  const { data, error } = await params.supabaseAdmin
    .from('subscription_products')
    .select('id')
    .eq('product_key', params.productKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!(data as { id?: string } | null)?.id) {
    throw new ApiError('HRMS subscription product is not configured', 400);
  }

  return data as { id: string };
}

async function getAvailableWorkspaceSeat(params: {
  productId: string;
  supabaseAdmin: any;
  workspaceId: string;
}) {
  const { data, error } = await params.supabaseAdmin
    .from('workspace_module_seats')
    .select('id, seats_purchased, seats_used, status')
    .eq('workspace_id', params.workspaceId)
    .eq('product_id', params.productId)
    .in('status', ['active', 'trialing'])
    .limit(1);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const seat = (
    data as Array<{
      id: string;
      seats_purchased: number;
      seats_used: number;
      status: string;
    }> | null
  )?.[0];

  if (!seat) {
    throw new ApiError(
      'No active HRMS seat subscription found for this workspace',
      400,
    );
  }

  if (seat.seats_used >= seat.seats_purchased) {
    throw new ApiError(
      `No HRMS seats available. All ${seat.seats_purchased} seat(s) are already in use.`,
      400,
    );
  }

  return seat;
}

async function cleanupGeneratedLoginAccount(params: {
  accountId: string;
  supabaseAdmin: any;
  workspaceId: string;
}) {
  await params.supabaseAdmin
    .from('workspace_members')
    .delete()
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', params.accountId);

  await params.supabaseAdmin.auth.admin.deleteUser(params.accountId);

  await params.supabaseAdmin
    .from('accounts')
    .delete()
    .eq('id', params.accountId);
}

export {
  createEmployeeController,
  deleteEmployeeController,
  updateEmployeeController,
};
