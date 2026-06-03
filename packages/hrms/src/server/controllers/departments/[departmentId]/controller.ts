import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';
import {
  getHrmsClient,
  getRequiredWorkspaceId,
  getRouteUserId,
  requireEmployeePermission,
} from '../../employees/controller.helpers';
import {
  type DepartmentRow,
  departmentSelect,
  getDepartmentId,
  normalizeNullable,
  validateDepartmentReferences,
  withDepartmentRelations,
} from '../utils';

type DepartmentWriteBody = {
  code?: string | null;
  cost_center_code?: string | null;
  head_account_id?: string | null;
  is_active?: boolean;
  name?: string | null;
  parent_department_id?: string | null;
};

const departmentModuleKey = 'hrms_departments';

const getDepartmentController = catchAsync(
  async ({ params, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);
    const userId = getRouteUserId(user);
    const workspaceId = await getRequiredWorkspaceId({
      request,
      supabaseAdmin,
      userId,
    });
    const departmentId = getDepartmentId(params);

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
      .eq('id', departmentId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error) {
      throw new ApiError(error.message, error.code === 'PGRST116' ? 404 : 400);
    }

    const [department] = await withDepartmentRelations({
      departments: data ? [data as DepartmentRow] : [],
      supabaseAdmin,
      workspaceId,
    });

    return successDataResponse('Department fetched successfully', department);
  },
);

const updateDepartmentController = catchAsync(
  async ({ body, params, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);
    const userId = getRouteUserId(user);
    const workspaceId = await getRequiredWorkspaceId({
      request,
      supabaseAdmin,
      userId,
    });
    const departmentBody = body as DepartmentWriteBody;
    const departmentId = getDepartmentId(params);

    await requireEmployeePermission({
      featureKey: 'edit',
      minAccessLevel: 'team',
      moduleKey: departmentModuleKey,
      supabaseAdmin,
      userId,
      workspaceId,
    });

    const { data: existingDepartment, error: existingDepartmentError } =
      await hrms
        .from('departments')
        .select('id')
        .eq('id', departmentId)
        .eq('workspace_id', workspaceId)
        .single();

    if (existingDepartmentError || !existingDepartment) {
      throw new ApiError('Department not found', 404);
    }

    const parentDepartmentId =
      departmentBody.parent_department_id === undefined
        ? undefined
        : normalizeNullable(departmentBody.parent_department_id);

    await validateDepartmentReferences({
      departmentId,
      headAccountId:
        departmentBody.head_account_id === undefined
          ? undefined
          : normalizeNullable(departmentBody.head_account_id),
      parentDepartmentId,
      supabaseAdmin,
      workspaceId,
    });

    const payload = {
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
      name: departmentBody.name?.trim(),
      parent_department_id:
        departmentBody.parent_department_id === undefined
          ? undefined
          : parentDepartmentId,
      updated_by: userId,
    };

    const { data, error } = await hrms
      .from('departments')
      .update(payload)
      .eq('id', departmentId)
      .eq('workspace_id', workspaceId)
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

    return successDataResponse('Department updated successfully', department);
  },
);

const deleteDepartmentController = catchAsync(
  async ({ params, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);
    const userId = getRouteUserId(user);
    const workspaceId = await getRequiredWorkspaceId({
      request,
      supabaseAdmin,
      userId,
    });
    const departmentId = getDepartmentId(params);

    await requireEmployeePermission({
      featureKey: 'delete',
      minAccessLevel: 'team',
      moduleKey: departmentModuleKey,
      supabaseAdmin,
      userId,
      workspaceId,
    });

    const { error } = await hrms
      .from('departments')
      .delete()
      .eq('id', departmentId)
      .eq('workspace_id', workspaceId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Department deleted successfully');
  },
);

export {
  deleteDepartmentController,
  getDepartmentController,
  updateDepartmentController,
};
