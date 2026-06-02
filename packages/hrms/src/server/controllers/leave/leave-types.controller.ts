import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import { getRequiredLeaveContext } from './controller.queries';
import {
  type LeaveTypeBody,
  type LeaveTypeInsert,
  type LeaveTypeUpdate,
} from './controller.types';
import { normalizeLeaveTypeCode, normalizeNullableText } from './utils';

const listLeaveTypesController = catchAsync(async ({ user }) => {
  const context = await getRequiredLeaveContext(user?.id);
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const canReadLeaveTypes =
    context.permissions.canApply ||
    context.permissions.canViewRequests ||
    context.permissions.canViewApprovals ||
    context.permissions.canViewReports ||
    context.permissions.canManageLeaveTypes;

  if (!canReadLeaveTypes) {
    throw new ApiError('Forbidden', 403);
  }

  const { data, error } = await supabaseAdmin
    .from('leave_types')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('name', { ascending: true });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Leave types fetched successfully', data ?? []);
});

const createLeaveTypeController = catchAsync(async ({ body, user }) => {
  const context = await getRequiredLeaveContext(user?.id);
  const leaveTypeBody = body as LeaveTypeBody;
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  if (!context.permissions.canManageLeaveTypes) {
    throw new ApiError('Forbidden', 403);
  }

  const payload: LeaveTypeInsert = {
    annual_allocation: leaveTypeBody.annual_allocation ?? 0,
    can_carry_forward: leaveTypeBody.can_carry_forward ?? false,
    code: normalizeLeaveTypeCode(leaveTypeBody.code ?? ''),
    created_by: user?.id,
    description: normalizeNullableText(leaveTypeBody.description),
    is_active: leaveTypeBody.is_active ?? true,
    name: leaveTypeBody.name?.trim() ?? '',
    organization_id: context.organizationId,
    requires_hr_approval: leaveTypeBody.requires_hr_approval ?? false,
    updated_by: user?.id,
  };

  const { data, error } = await supabaseAdmin
    .from('leave_types')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Leave type created successfully', data);
});

const updateLeaveTypeController = catchAsync(async ({ body, params, user }) => {
  const context = await getRequiredLeaveContext(user?.id);
  const leaveTypeBody = body as LeaveTypeBody;
  const typeId = params?.typeId;
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

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
    updated_by: user?.id,
  };

  const { data, error } = await supabaseAdmin
    .from('leave_types')
    .update(payload)
    .eq('organization_id', context.organizationId)
    .eq('id', typeId)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Leave type updated successfully', data);
});

const deleteLeaveTypeController = catchAsync(async ({ params, user }) => {
  const context = await getRequiredLeaveContext(user?.id);
  const typeId = params?.typeId;
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  if (!context.permissions.canManageLeaveTypes) {
    throw new ApiError('Forbidden', 403);
  }

  if (!typeId) {
    throw new ApiError('Leave type id is required', 400);
  }

  const { data, error } = await supabaseAdmin
    .from('leave_types')
    .update({
      is_active: false,
      updated_by: user?.id,
    })
    .eq('organization_id', context.organizationId)
    .eq('id', typeId)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Leave type archived successfully', data);
});

export {
  createLeaveTypeController,
  deleteLeaveTypeController,
  listLeaveTypesController,
  updateLeaveTypeController,
};
