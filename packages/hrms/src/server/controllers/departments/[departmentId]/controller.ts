import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  departmentSelect,
  getDepartmentId,
  normalizeNullable,
  validateDepartmentReferences,
  withParentDepartments,
} from '../utils';

type DepartmentWriteBody = {
  code?: string | null;
  cost_center_code?: string | null;
  head_account_id?: string | null;
  is_active?: boolean;
  name?: string | null;
  parent_department_id?: string | null;
};
type DepartmentUpdate = Database['public']['Tables']['departments']['Update'];

const getDepartmentController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);
  const departmentId = getDepartmentId(params);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const { data, error } = await supabaseAdmin
    .from('departments')
    .select(departmentSelect)
    .eq('id', departmentId)
    .eq('organization_id', organizationId)
    .single();

  if (error) {
    throw new ApiError(error.message, error.code === 'PGRST116' ? 404 : 400);
  }

  const [department] = await withParentDepartments({
    departments: data ? [data] : [],
    organizationId,
  });

  return successDataResponse('Department fetched successfully', department);
});

const updateDepartmentController = catchAsync(
  async ({ body, params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<Database>();
    const organizationId = await getCurrentUserOrganizationId(user?.id);
    const departmentBody = body as DepartmentWriteBody;
    const departmentId = getDepartmentId(params);

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    const { data: existingDepartment, error: existingDepartmentError } =
      await supabaseAdmin
        .from('departments')
        .select('id')
        .eq('id', departmentId)
        .eq('organization_id', organizationId)
        .single();

    if (existingDepartmentError || !existingDepartment) {
      throw new ApiError('Department not found', 404);
    }

    const parentDepartmentId = normalizeNullable(
      departmentBody.parent_department_id,
    );

    if (parentDepartmentId === departmentId) {
      throw new ApiError('Department cannot be its own parent', 400);
    }

    await validateDepartmentReferences({
      headAccountId:
        departmentBody.head_account_id === undefined
          ? undefined
          : normalizeNullable(departmentBody.head_account_id),
      organizationId,
      parentDepartmentId,
    });

    const payload: DepartmentUpdate = {
      name: departmentBody.name?.trim(),
      code: departmentBody.code?.trim().toUpperCase(),
      cost_center_code:
        departmentBody.cost_center_code === undefined
          ? undefined
          : normalizeNullable(departmentBody.cost_center_code),
      head_account_id:
        departmentBody.head_account_id === undefined
          ? undefined
          : normalizeNullable(departmentBody.head_account_id),
      is_active: departmentBody.is_active,
      parent_department_id:
        departmentBody.parent_department_id === undefined
          ? undefined
          : parentDepartmentId,
      updated_by: user?.id,
    };

    const { data, error } = await supabaseAdmin
      .from('departments')
      .update(payload)
      .eq('id', departmentId)
      .eq('organization_id', organizationId)
      .select(departmentSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    const [department] = await withParentDepartments({
      departments: data ? [data] : [],
      organizationId,
    });

    return successDataResponse('Department updated successfully', department);
  },
);

const deleteDepartmentController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);
  const departmentId = getDepartmentId(params);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const { error } = await supabaseAdmin
    .from('departments')
    .delete()
    .eq('id', departmentId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Department deleted successfully');
});

export {
  getDepartmentController,
  updateDepartmentController,
  deleteDepartmentController,
};
