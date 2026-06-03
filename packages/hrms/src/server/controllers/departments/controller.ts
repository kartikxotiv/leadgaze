import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  departmentSelect,
  getDepartmentHeadAccounts,
  normalizeNullable,
  validateDepartmentReferences,
  withParentDepartments,
} from './utils';

type DepartmentInsert = Database['public']['Tables']['departments']['Insert'];
type DepartmentWriteBody = {
  code?: string | null;
  cost_center_code?: string | null;
  head_account_id?: string | null;
  is_active?: boolean;
  name?: string | null;
  parent_department_id?: string | null;
};

const createDepartmentController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);
  const departmentBody = body as DepartmentWriteBody;

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  await validateDepartmentReferences({
    headAccountId: normalizeNullable(departmentBody.head_account_id),
    organizationId,
    parentDepartmentId: departmentBody.parent_department_id ?? null,
  });

  const payload: DepartmentInsert = {
    name: departmentBody.name?.trim() ?? '',
    code: departmentBody.code?.trim().toUpperCase() ?? '',
    cost_center_code: normalizeNullable(departmentBody.cost_center_code),
    head_account_id: normalizeNullable(departmentBody.head_account_id),
    is_active: departmentBody.is_active ?? true,
    organization_id: organizationId,
    parent_department_id: normalizeNullable(
      departmentBody.parent_department_id,
    ),
    created_by: user?.id,
    updated_by: user?.id,
  };

  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert(payload)
    .select(departmentSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const [department] = await withParentDepartments({
    departments: data ? [data] : [],
    organizationId,
  });

  return successDataResponse('Department created successfully', department);
});

const listDepartmentsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const { data, error } = await supabaseAdmin
    .from('departments')
    .select(departmentSelect)
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const departments = await withParentDepartments({
    departments: data ?? [],
    organizationId,
  });

  return successDataResponse('Departments fetched successfully', departments);
});

const getDepartmentOptionsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const [
    { data: departments, error: departmentsError },
    headAccounts,
  ] = await Promise.all([
    supabaseAdmin
      .from('departments')
      .select('id, name, code')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
    getDepartmentHeadAccounts(organizationId),
  ]);

  if (departmentsError) {
    throw new ApiError(departmentsError.message, 400);
  }

  return successDataResponse('Department options fetched successfully', {
    departments: departments ?? [],
    headAccounts,
  });
});

export {
  createDepartmentController,
  getDepartmentOptionsController,
  listDepartmentsController,
};
