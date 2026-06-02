import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { requirePermission } from '~/lib/server/rbac';
import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';

import {
  ensureEmployeeInOrganization,
  getRequiredOrganizationId,
  getResignationOrThrow,
  BaseSeparationItem,
  ExtendedDatabase,
} from '../separation/utils';

type ExitLetterBody = {
  employee_id: string;
  resignation_id?: string | null;
  letter_type: 'RELIEVING' | 'EXPERIENCE';
  issued_by?: string | null;
  issued_at?: string | null;
  letter_number?: string | null;
  letter_url?: string | null;
  remarks?: string | null;
  status?: 'DRAFT' | 'ISSUED' | 'CANCELLED';
};

const exitLetterSelect = `
  id,
  employee_id,
  resignation_id,
  letter_type,
  issued_by,
  issued_at,
  letter_number,
  letter_url,
  remarks,
  status,
  created_at,
  updated_at,
  employee:employees!employee_exit_letters_employee_id_fkey!inner(
    id,
    first_name,
    last_name,
    employee_code,
    organization_id
  ),
  issued_by_employee:employees!employee_exit_letters_issued_by_fkey(
    id,
    first_name,
    last_name,
    employee_code
  )
`;

const listExitLettersController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_letters',
    minAccessLevel: 'team',
  });

  const { data, error } = await supabaseAdmin
    .from('employee_exit_letters')
    .select(exitLetterSelect)
    .eq('employee.organization_id', organizationId)
    .order('created_at', { ascending: false });

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

  return successDataResponse('Exit letters fetched successfully', rows);
});

const getExitLetterController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const letterId = params?.id;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'view_letters',
    minAccessLevel: 'team',
  });

  if (!letterId) {
    throw new ApiError('Exit letter id is required', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('employee_exit_letters')
    .select(exitLetterSelect)
    .eq('id', letterId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('Exit letter fetched successfully', result);
});

const createExitLetterController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const payload = body as ExitLetterBody;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_letters',
    minAccessLevel: 'team',
  });

  await ensureEmployeeInOrganization({
    employeeId: payload.employee_id,
    organizationId,
  });

  if (payload.resignation_id) {
    const resignation = await getResignationOrThrow({
      resignationId: payload.resignation_id,
      organizationId,
    });

    if (resignation.employee_id !== payload.employee_id) {
      throw new ApiError('resignation_id does not belong to employee_id', 400);
    }
  }

  if (payload.issued_by) {
    await ensureEmployeeInOrganization({
      employeeId: payload.issued_by,
      organizationId,
      fieldName: 'issued_by',
    });
  }

  const { data, error } = await supabaseAdmin
    .from('employee_exit_letters')
    .insert({
      employee_id: payload.employee_id,
      resignation_id: payload.resignation_id ?? null,
      letter_type: payload.letter_type,
      issued_by: payload.issued_by ?? null,
      issued_at: payload.issued_at ?? null,
      letter_number: payload.letter_number ?? null,
      letter_url: payload.letter_url ?? null,
      remarks: payload.remarks ?? null,
      status: payload.status ?? 'DRAFT',
    })
    .select(exitLetterSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('Exit letter created successfully', result);
});

const updateExitLetterController = catchAsync(async ({ body, params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const letterId = params?.id;
  const payload = body as Partial<ExitLetterBody>;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_letters',
    minAccessLevel: 'team',
  });

  if (!letterId) {
    throw new ApiError('Exit letter id is required', 400);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('employee_exit_letters')
    .select('id, employee_id, resignation_id, employee:employees!employee_exit_letters_employee_id_fkey!inner(id, organization_id)')
    .eq('id', letterId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(existingError.message, 400);
  }

  if (!existing) {
    throw new ApiError('Exit letter not found', 404);
  }

  const nextEmployeeId = payload.employee_id ?? (existing as unknown as BaseSeparationItem).employee_id as string;
  const nextResignationId =
    payload.resignation_id === undefined
      ? (existing as unknown as BaseSeparationItem).resignation_id as string
      : (payload.resignation_id as string);

  if (payload.employee_id) {
    await ensureEmployeeInOrganization({
      employeeId: payload.employee_id,
      organizationId,
    });
  }

  if (payload.issued_by) {
    await ensureEmployeeInOrganization({
      employeeId: payload.issued_by,
      organizationId,
      fieldName: 'issued_by',
    });
  }

  if (nextResignationId) {
    const resignation = await getResignationOrThrow({
      resignationId: nextResignationId,
      organizationId,
    });

    if (resignation.employee_id !== nextEmployeeId) {
      throw new ApiError('resignation_id does not belong to employee_id', 400);
    }
  }

  const { data, error } = await supabaseAdmin
    .from('employee_exit_letters')
    .update({
      employee_id: payload.employee_id,
      resignation_id: payload.resignation_id,
      letter_type: payload.letter_type,
      issued_by: payload.issued_by,
      issued_at: payload.issued_at,
      letter_number: payload.letter_number,
      letter_url: payload.letter_url,
      remarks: payload.remarks,
      status: payload.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', letterId)
    .select(exitLetterSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const result = data as unknown as BaseSeparationItem;

  if (result.employee?.organization_id) {
    delete result.employee.organization_id;
  }

  return successDataResponse('Exit letter updated successfully', result);
});

const deleteExitLetterController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<ExtendedDatabase>();
  const organizationId = await getRequiredOrganizationId(user?.id);
  const letterId = params?.id;
  await requirePermission({
    accountId: user!.id,
    organizationId,
    moduleKey: 'separation',
    featureKey: 'manage_letters',
    minAccessLevel: 'team',
  });

  if (!letterId) {
    throw new ApiError('Exit letter id is required', 400);
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('employee_exit_letters')
    .select('id, employee:employees!employee_exit_letters_employee_id_fkey!inner(id, organization_id)')
    .eq('id', letterId)
    .eq('employee.organization_id', organizationId)
    .maybeSingle();

  if (existingError) {
    throw new ApiError(existingError.message, 400);
  }

  if (!existing) {
    throw new ApiError('Exit letter not found', 404);
  }

  const { error } = await supabaseAdmin
    .from('employee_exit_letters')
    .delete()
    .eq('id', letterId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Exit letter deleted successfully', null);
});

export {
  createExitLetterController,
  deleteExitLetterController,
  getExitLetterController,
  listExitLettersController,
  updateExitLetterController,
};
