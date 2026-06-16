import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import {
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from '../employees/controller.helpers';
import {
  type DepartmentRow,
  departmentSelect,
  getDepartmentHeadAccounts,
  normalizeNullable,
  validateDepartmentReferences,
  withDepartmentRelations,
} from './utils';

type DepartmentWriteBody = {
  code?: string | null;
  cost_center_code?: string | null;
  head_account_id?: string | null;
  is_active?: boolean;
  name?: string | null;
  parent_department_id?: string | null;
};

const departmentModuleKey = 'hrms_departments';

const createDepartmentController = catchAsync(
  async ({ body, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);
    const userId = getRouteUserId(user);
    const workspaceId = await getRequiredWorkspaceId({
      request,
      supabaseAdmin,
      userId,
    });
    const departmentBody = body as DepartmentWriteBody;

    await requireEmployeePermission({
      featureKey: 'create',
      minAccessLevel: 'team',
      moduleKey: departmentModuleKey,
      supabaseAdmin,
      userId,
      workspaceId,
    });

    await validateDepartmentReferences({
      headAccountId: normalizeNullable(departmentBody.head_account_id),
      parentDepartmentId: normalizeNullable(
        departmentBody.parent_department_id,
      ),
      supabaseAdmin,
      workspaceId,
    });

    const payload = {
      code: departmentBody.code?.trim().toUpperCase() ?? '',
      cost_center_code: normalizeNullable(departmentBody.cost_center_code),
      created_by: userId,
      head_account_id: normalizeNullable(departmentBody.head_account_id),
      is_active: departmentBody.is_active ?? true,
      name: departmentBody.name?.trim() ?? '',
      parent_department_id: normalizeNullable(
        departmentBody.parent_department_id,
      ),
      updated_by: userId,
      workspace_id: workspaceId,
    };

    const { data, error } = await hrms
      .from('departments')
      .insert(payload)
      .select(departmentSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    const [department] = await withDepartmentRelations({
      departments: data ? [data as DepartmentRow] : [],
      supabaseAdmin,
      workspaceId,
    });

    return successDataResponse('Department created successfully', department);
  },
);

const listDepartmentsController = catchAsync(async ({ request, user }) => {
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
    moduleKey: departmentModuleKey,
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const { data, error } = await hrms
    .from('departments')
    .select(departmentSelect)
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const departments = await withDepartmentRelations({
    departments: (data ?? []) as DepartmentRow[],
    supabaseAdmin,
    workspaceId,
  });

  return successDataResponse('Departments fetched successfully', departments);
});

const getDepartmentOptionsController = catchAsync(async ({ request, user }) => {
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
    moduleKey: departmentModuleKey,
    supabaseAdmin,
    userId,
    workspaceId,
  });

  const [{ data: departments, error: departmentsError }, headAccounts] =
    await Promise.all([
      hrms
        .from('departments')
        .select('id, name, code')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true }),
      getDepartmentHeadAccounts(workspaceId, supabaseAdmin),
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
