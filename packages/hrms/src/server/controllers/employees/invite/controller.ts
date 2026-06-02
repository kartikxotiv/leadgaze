import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import appConfig from '~/config/app.config';
import {
  INVITE_USER_TO_ORGANIZATION_EMAIL_TEMPLATE,
  INVITE_USER_TO_ORGANIZATION_EMAIL_TEMPLATE_EXISTING_ACCOUNT,
} from '~/constants/email.templates/invite-user';
import { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';
import { transporter } from '~/utils/send-mail';

import {
  EmployeeBody,
  ensureUniqueEmployeeEmail,
  ensureUniqueEmployeeForAccount,
  findOrganizationAccountByEmail,
  normalizeNullable,
  validateEmployeeReferences,
} from '../utils';

type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];

const getEmployeeInvitedController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const { data, error } = await supabaseAdmin
    .from('invited_employees')
    .select('employee:employees(work_email),status')
    .eq('organization_id', organizationId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Employee options fetched successfully', {
    invitedEmployees: data ?? [],
  });
});

const sendInviteController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);
  const employeeBody = body as EmployeeBody;

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

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

  let accountId =
    employeeBody.account_id ?? existingOrganizationAccount?.id ?? null;

  if (!accountId) {
    const { data: globalAccount } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('email', workEmail)
      .maybeSingle();

    if (globalAccount) {
      accountId = globalAccount.id;
    }
  }

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

  if (employeeBody.employee_code) {
    const { data: existingCode } = await supabaseAdmin
      .from('employees')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('employee_code', employeeBody.employee_code.trim().toUpperCase())
      .limit(1)
      .maybeSingle();

    if (existingCode) {
      throw new ApiError(
        'An employee already exists with this employee code',
        400,
      );
    }
  }

  const { data: organization } = await supabaseAdmin
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  const orgName = organization?.name ?? appConfig.name;

  let invitedAt: string | null = null;
  let status: Database['public']['Enums']['employee_status'] =
    employeeBody.status ?? 'active';
  let tempPassword = '';
  let isNewAccount = false;

  if (!accountId) {
    if (employeeBody.invite_if_missing === false) {
      throw new ApiError('User is not part of the organization', 400);
    }

    tempPassword = Math.random().toString(36).slice(-8) + 'Aa1!';

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.createUser({
        email: workEmail,
        password: tempPassword,
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

    if (inviteError) {
      throw new ApiError(inviteError.message, 400);
    }

    invitedAt = new Date().toISOString();
    status = 'invited';
    accountId = inviteData.user?.id ?? null;
    isNewAccount = true;
  } else {
    // Determine if we consider them "invited" vs "active" if they are pre-existing
    // Let's standardise on invited until they log in, or keep their payload status.
    if (employeeBody.status === 'invited' || !employeeBody.status) {
      invitedAt = new Date().toISOString();
      status = 'invited';
    }
  }

  const payload: EmployeeInsert = {
    account_id: accountId,
    department_id: normalizeNullable(employeeBody.department_id),
    shift_id: normalizeNullable(employeeBody.shift_id),
    designation: normalizeNullable(employeeBody.designation),
    employee_code: employeeBody.employee_code?.trim().toUpperCase() ?? '',
    employment_type: employeeBody.employment_type ?? 'full_time',
    first_name: employeeBody.first_name?.trim() ?? '',
    invited_at: invitedAt,
    invited_by: user?.id,
    joining_date: employeeBody.joining_date ?? null,
    last_name: normalizeNullable(employeeBody.last_name),
    manager_employee_id: normalizeNullable(employeeBody.manager_employee_id),
    organization_id: organizationId,
    phone: normalizeNullable(employeeBody.phone),
    status,
    work_email: workEmail,
    created_by: user?.id,
    updated_by: user?.id,
  };

  const { data: employeeData, error: employeeError } = await supabaseAdmin
    .from('employees')
    .insert(payload)
    .select('id')
    .single();

  if (employeeError) {
    throw new ApiError(employeeError.message, 400);
  }

  if (employeeBody.role_id) {
    await supabaseAdmin.from('employee_roles').insert({
      organization_id: organizationId,
      employee_id: employeeData.id,
      role_id: employeeBody.role_id,
      created_by: user?.id,
      updated_by: user?.id,
    });
  }

  const { error: invitedError } = await supabaseAdmin
    .from('invited_employees')
    .insert({
      organization_id: organizationId,
      employee_id: employeeData.id,
      status: 'invited',
      create_by: user?.id,
    });

  if (invitedError) {
    throw new ApiError(invitedError.message, 400);
  }

  // Send invitation email
  if (status === 'invited') {
    const loginLink = `${appConfig.url}/auth/sign-in`;

    try {
      const nodemailerMail = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'kartik.gupta@xotiv.com',
        to: workEmail,
        subject: `You've been invited to join ${orgName}`,
        html: isNewAccount
          ? INVITE_USER_TO_ORGANIZATION_EMAIL_TEMPLATE({
              orgName,
              tempPassword,
              loginLink,
              employeeBody,
            })
          : INVITE_USER_TO_ORGANIZATION_EMAIL_TEMPLATE_EXISTING_ACCOUNT({
              orgName,
              loginLink,
              employeeBody,
            }),
      });
      console.log({ nodemailerMail });
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // We log the error but don't fail the request since the employee was created successfully
    }
  }

  return successDataResponse('Employee invited successfully', employeeData);
});

export { sendInviteController, getEmployeeInvitedController };
