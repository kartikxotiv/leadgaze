import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import { getHrmsClient, getRouteUserId } from '../employees/controller.helpers';
import { getRequiredLeaveContext } from './controller.queries';
import {
  type LeaveTypeBody,
  type LeaveTypeInsert,
  type LeaveTypeUpdate,
} from './controller.types';
import { normalizeLeaveTypeCode, normalizeNullableText } from './utils';

const listLeaveTypesController = catchAsync(async ({ request, user }) => {
  const userId = getRouteUserId(user);
  const context = await getRequiredLeaveContext({
    request,
    userId,
  });
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const canReadLeaveTypes =
    context.permissions.canApply ||
    context.permissions.canViewRequests ||
    context.permissions.canViewApprovals ||
    context.permissions.canViewReports ||
    context.permissions.canManageLeaveTypes;

  if (!canReadLeaveTypes) {
    throw new ApiError('Forbidden', 403);
  }

  const { data, error } = await hrms
    .from('leave_types')
    .select('*')
    .eq('workspace_id', context.organizationId)
    .order('name', { ascending: true });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(
    'Leave types fetched successfully',
    ((data ?? []) as Array<{ workspace_id: string }>).map(addOrganizationAlias),
  );
});

const createLeaveTypeController = catchAsync(
  async ({ body, request, user }) => {
    const userId = getRouteUserId(user);
    const context = await getRequiredLeaveContext({
      request,
      userId,
    });
    const leaveTypeBody = body as LeaveTypeBody;
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);

    if (!context.permissions.canManageLeaveTypes) {
      throw new ApiError('Forbidden', 403);
    }

    const payload: LeaveTypeInsert = {
      annual_allocation: leaveTypeBody.annual_allocation ?? 0,
      can_carry_forward: leaveTypeBody.can_carry_forward ?? false,
      code: normalizeLeaveTypeCode(leaveTypeBody.code ?? ''),
      created_by: userId,
      description: normalizeNullableText(leaveTypeBody.description),
      is_active: leaveTypeBody.is_active ?? true,
      name: leaveTypeBody.name?.trim() ?? '',
      workspace_id: context.organizationId,
      requires_hr_approval: leaveTypeBody.requires_hr_approval ?? false,
      updated_by: userId,
    };

    const { data, error } = await hrms
      .from('leave_types')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(
      'Leave type created successfully',
      addOrganizationAlias(data as { workspace_id: string }),
    );
  },
);

const updateLeaveTypeController = catchAsync(
  async ({ body, params, request, user }) => {
    const userId = getRouteUserId(user);
    const context = await getRequiredLeaveContext({
      request,
      userId,
    });
    const leaveTypeBody = body as LeaveTypeBody;
    const typeId = params?.typeId;
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);

    if (!context.permissions.canManageLeaveTypes) {
      throw new ApiError('Forbidden', 403);
    }

    if (!typeId) {
      throw new ApiError('Leave type id is required', 400);
    }

    const payload: LeaveTypeUpdate = {
      annual_allocation:
        leaveTypeBody.annual_allocation === undefined
          ? undefined
          : leaveTypeBody.annual_allocation,
      can_carry_forward: leaveTypeBody.can_carry_forward,
      code:
        leaveTypeBody.code === undefined
          ? undefined
          : normalizeLeaveTypeCode(leaveTypeBody.code),
      description:
        leaveTypeBody.description === undefined
          ? undefined
          : normalizeNullableText(leaveTypeBody.description),
      is_active: leaveTypeBody.is_active,
      name: leaveTypeBody.name?.trim(),
      requires_hr_approval: leaveTypeBody.requires_hr_approval,
      updated_by: userId,
    };

    const { data, error } = await hrms
      .from('leave_types')
      .update(payload)
      .eq('workspace_id', context.organizationId)
      .eq('id', typeId)
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(
      'Leave type updated successfully',
      addOrganizationAlias(data as { workspace_id: string }),
    );
  },
);

const deleteLeaveTypeController = catchAsync(
  async ({ params, request, user }) => {
    const userId = getRouteUserId(user);
    const context = await getRequiredLeaveContext({
      request,
      userId,
    });
    const typeId = params?.typeId;
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);

    if (!context.permissions.canManageLeaveTypes) {
      throw new ApiError('Forbidden', 403);
    }

    if (!typeId) {
      throw new ApiError('Leave type id is required', 400);
    }

    const { data, error } = await hrms
      .from('leave_types')
      .update({
        is_active: false,
        updated_by: userId,
      })
      .eq('workspace_id', context.organizationId)
      .eq('id', typeId)
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(
      'Leave type archived successfully',
      addOrganizationAlias(data as { workspace_id: string }),
    );
  },
);

function addOrganizationAlias<T extends { workspace_id: string }>(item: T) {
  return {
    ...item,
    organization_id: item.workspace_id,
  };
}

export {
  createLeaveTypeController,
  deleteLeaveTypeController,
  listLeaveTypesController,
  updateLeaveTypeController,
};
