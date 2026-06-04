import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { requirePermission } from '~/lib/server/rbac';
import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';
import {
  ensureEmployeeInOrganization,
  getRequiredOrganizationId,
  BaseSeparationItem,
  ExtendedDatabase,
} from '../separation/utils';
type ResignationBody = {
  employee_id?: string;
  resignation_date: string;
  last_working_day?: string | null;
  notice_period_days?: number | null;
  notice_waiver_days?: number;
  reason: string;
  status?: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'RETRACTED';
  remarks?: string | null;
  accepted_by?: string | null;
  accepted_at?: string | null;
};
type ResignationRow = BaseSeparationItem & {
  accepted_at?: string | null;
  accepted_by?: string | null;
  employee_id: string;
  last_working_day?: string | null;
  notice_period_days?: number | null;
  notice_waiver_days?: number | null;
  reason?: string | null;
  resignation_date?: string | null;
  status?: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'RETRACTED';
};
const resignationSelect = `
  id,
  employee_id,
  resignation_date,
  last_working_day,
  notice_period_days,
  notice_waiver_days,
  reason,
  status,
  remarks,
  accepted_by,
  accepted_at,
  created_at,
  updated_at,
  employee:employees!resignation_requests_employee_id_fkey!inner(
    id,
    first_name,
    last_name,
    employee_code,
    designation,
    organization_id,
    department:departments!employees_department_id_fkey(
      id,
      name,
      code
    )
  ),
  accepted_by_employee:employees!resignation_requests_accepted_by_fkey(
    id,
    first_name,
    last_name,
    employee_code
  )
`;
const listResignationsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const viewAccess = await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_resignation',
    minAccessLevel: 'own',
  });
  if (
    viewAccess.permission.accessLevel === 'own' &&
    !viewAccess.employeeId
  ) {
    return successDataResponse('Resignations fetched successfully', []);
  }
  let query = supabaseAdmin
    .from('resignation_requests')
    .select(resignationSelect)
    .eq('employee.organization_id', organizationId);
  if (viewAccess.permission.accessLevel === 'own') {
    query = query.eq('employee_id', viewAccess.employeeId);
  }
  const { data, error } = await query.order('created_at', { ascending: false });
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
  return successDataResponse('Resignations fetched successfully', rows);
});
const getResignationController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const resignationId = params?.id;
  if (!resignationId) {
    throw new ApiError('Resignation id is required', 400);
  }
  const { data: existing, error: existingError } = await supabaseAdmin
    .from('resignation_requests')
    .select(
      'id, employee_id, status, accepted_by, accepted_at, employee:employees!resignation_requests_employee_id_fkey!inner(id, organization_id)',
    )
    .eq('id', resignationId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();
  if (existingError) {
    throw new ApiError(existingError.message, 400);
  }
  if (!existing) {
    throw new ApiError('Resignation request not found', 404);
  }
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_resignation',
    minAccessLevel: 'own',
    targetEmployeeId: (existing as unknown as ResignationRow).employee_id,
  });
  const { data, error } = await supabaseAdmin
    .from('resignation_requests')
    .select(resignationSelect)
    .eq('id', resignationId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();
  if (error) {
    throw new ApiError(error.message, 400);
  }
  const result = data as unknown as BaseSeparationItem;
  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }
  return successDataResponse('Resignation fetched successfully', result);
});
const getResignationByEmployeeIdController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const employeeId = params?.employee_id;
  if (!employeeId) {
    throw new ApiError('Employee id is required', 400);
  }
  await ensureEmployeeInOrganization({
    employeeId,
    organizationId,
  });
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_resignation',
    minAccessLevel: 'own',
    targetEmployeeId: employeeId,
  });
  const { data, error } = await supabaseAdmin
    .from('resignation_requests')
    .select(resignationSelect)
    .eq('employee_id', employeeId)
    .eq('employee.organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    throw new ApiError(error.message, 400);
  }
  const result = data as unknown as BaseSeparationItem;
  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }
  return successDataResponse('Resignation fetched successfully', result);
});
const createResignationController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const payload = body as ResignationBody;
  const createAccess = await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'create_resignation',
    minAccessLevel: 'own',
  });
  const currentEmployeeId = createAccess.employeeId;
  const targetEmployeeId = payload.employee_id ?? currentEmployeeId;

  if (!targetEmployeeId) {
    throw new ApiError('Employee profile not found for this user', 400);
  }

  const isSelfSubmission = targetEmployeeId === currentEmployeeId;

  if (!isSelfSubmission) {
    await requirePermission({
      accountId: user!.id,
      organizationId,
      moduleKey: 'separation',
      featureKey: 'manage_resignation',
      minAccessLevel: 'team',
    });
  }

  await ensureEmployeeInOrganization({
    employeeId: targetEmployeeId,
    organizationId,
  });

  if (!isSelfSubmission && payload.accepted_by) {
    await ensureEmployeeInOrganization({
      employeeId: payload.accepted_by,
      organizationId,
      fieldName: 'accepted_by',
    });
  }

  const { data: activeResignation, error: activeResignationError } =
    await supabaseAdmin
      .from('resignation_requests')
      .select('id')
      .eq('employee_id', targetEmployeeId)
      .in('status', ['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED'])
      .limit(1)
      .maybeSingle();

  if (activeResignationError) {
    throw new ApiError(activeResignationError.message, 400);
  }

  if (activeResignation) {
    throw new ApiError(
      'An active resignation request already exists for this employee',
      400,
    );
  }

  const requestedStatus = isSelfSubmission
    ? 'SUBMITTED'
    : (payload.status ?? 'SUBMITTED');
  const acceptedBy = isSelfSubmission
    ? null
    : requestedStatus === 'ACCEPTED'
      ? (payload.accepted_by ?? currentEmployeeId ?? null)
      : (payload.accepted_by ?? null);
  const acceptedAt = isSelfSubmission
    ? null
    : requestedStatus === 'ACCEPTED'
      ? (payload.accepted_at ?? new Date().toISOString())
      : (payload.accepted_at ?? null);

  const { data, error } = await supabaseAdmin
    .from('resignation_requests')
    .insert({
      employee_id: targetEmployeeId,
      resignation_date: payload.resignation_date,
      last_working_day: isSelfSubmission
        ? null
        : (payload.last_working_day ?? null),
      notice_period_days: isSelfSubmission
        ? null
        : (payload.notice_period_days ?? null),
      notice_waiver_days: isSelfSubmission ? 0 : (payload.notice_waiver_days ?? 0),
      reason: payload.reason,
      status: requestedStatus,
      remarks: isSelfSubmission ? null : (payload.remarks ?? null),
      accepted_by: acceptedBy,
      accepted_at: acceptedAt,
    })
    .select(resignationSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (requestedStatus === 'ACCEPTED') {
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .update({ status: 'notice_period' })
      .eq('id', targetEmployeeId)
      .select('id, first_name, last_name, employee_code, account_id')
      .single();

    if (employeeError) {
      throw new ApiError(employeeError.message, 400);
    }
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('Resignation created successfully', result);
});
const updateResignationController = catchAsync(async ({ body, params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const resignationId = params?.id;
  const payload = body as Partial<ResignationBody>;

  if (!resignationId) {
    throw new ApiError('Resignation id is required', 400);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('resignation_requests')
    .select(
      'id, employee_id, status, accepted_by, accepted_at, employee:employees!resignation_requests_employee_id_fkey!inner(id, organization_id)',
    )
    .eq('id', resignationId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(existingError.message, 400);
  }

  if (!existing) {
    throw new ApiError('Resignation request not found', 404);
  }

  const manageAccess = await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_resignation',
    minAccessLevel: 'team',
  });

  const existingRow = existing as unknown as ResignationRow;

  if (payload.employee_id && payload.employee_id !== existingRow.employee_id) {
    throw new ApiError('employee_id cannot be changed for a resignation', 400);
  }

  if (payload.accepted_by) {
    await ensureEmployeeInOrganization({
      employeeId: payload.accepted_by,
      organizationId,
      fieldName: 'accepted_by',
    });
  }

  const nextStatus = payload.status ?? existingRow.status;
  const shouldAccept = nextStatus === 'ACCEPTED';
  const acceptedBy =
    payload.accepted_by === undefined
      ? shouldAccept
        ? (existingRow.accepted_by ?? manageAccess.employeeId ?? null)
        : undefined
      : payload.accepted_by;
  const acceptedAt =
    payload.accepted_at === undefined
      ? shouldAccept
        ? (existingRow.accepted_at ?? new Date().toISOString())
        : undefined
      : payload.accepted_at;

  const { data, error } = await supabaseAdmin
    .from('resignation_requests')
    .update({
      resignation_date: payload.resignation_date,
      last_working_day: payload.last_working_day,
      notice_period_days: payload.notice_period_days,
      notice_waiver_days: payload.notice_waiver_days,
      reason: payload.reason,
      remarks: payload.remarks,
      status: payload.status,
      accepted_by: shouldAccept
        ? (acceptedBy ?? existingRow.accepted_by ?? null)
        : acceptedBy,
      accepted_at: acceptedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', resignationId)
    .select(resignationSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (payload.status === 'ACCEPTED') {
    const { error: employeeError } = await supabaseAdmin
      .from('employees')
      .update({ status: 'notice_period' })
      .eq('id', existingRow.employee_id);

    if (employeeError) {
      throw new ApiError(employeeError.message, 400);
    }
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('Resignation updated successfully', result);
});
const deleteResignationController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const resignationId = params?.id;

  if (!resignationId) {
    throw new ApiError('Resignation id is required', 400);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('resignation_requests')
    .select(
      'id, employee_id, status, employee:employees!resignation_requests_employee_id_fkey!inner(id, organization_id)',
    )
    .eq('id', resignationId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(existingError.message, 400);
  }

  if (!existing) {
    throw new ApiError('Resignation request not found', 404);
  }

  const existingRow = existing as unknown as ResignationRow;
  let canManage = false;

  try {
    await requirePermission({
      accountId: user!.id,
      organizationId,
      moduleKey: 'separation',
      featureKey: 'manage_resignation',
      minAccessLevel: 'team',
    });
    canManage = true;
  } catch (error) {
    if (!(error instanceof ApiError) || error.statusCode !== 403) {
      throw error;
    }
  }

  if (!canManage) {
    await requirePermission({
      accountId: user!.id,
      organizationId,
      moduleKey: 'separation',
      featureKey: 'view_resignation',
      minAccessLevel: 'own',
      targetEmployeeId: existingRow.employee_id,
    });

    if (existingRow.status === 'ACCEPTED') {
      throw new ApiError(
        'Accepted resignations can only be changed by HR or a manager',
        400,
      );
    }
  }

  const { error } = await supabaseAdmin
    .from('resignation_requests')
    .delete()
    .eq('id', resignationId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Resignation deleted successfully', null);
});
export {
  createResignationController,
  deleteResignationController,
  getResignationController,
  getResignationByEmployeeIdController,
  listResignationsController,
  updateResignationController,
};
