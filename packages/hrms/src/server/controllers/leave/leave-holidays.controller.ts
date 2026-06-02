import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import { getRequiredLeaveContext } from './controller.queries';
import {
  type LeaveHolidayBody,
  type LeaveHolidayInsert,
  type LeaveHolidayUpdate,
} from './controller.types';
import { normalizeNullableText } from './utils';

const listLeaveHolidaysController = catchAsync(async ({ user }) => {
  const context = await getRequiredLeaveContext(user?.id);
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  if (!context.permissions.canViewHolidays) {
    throw new ApiError('Forbidden', 403);
  }

  const { data, error } = await supabaseAdmin
    .from('leave_holidays')
    .select('*')
    .eq('organization_id', context.organizationId)
    .order('holiday_date', { ascending: true });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Leave holidays fetched successfully', data ?? []);
});

const createLeaveHolidayController = catchAsync(async ({ body, user }) => {
  const context = await getRequiredLeaveContext(user?.id);
  const holidayBody = body as LeaveHolidayBody;
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  if (!context.permissions.canManageHolidays) {
    throw new ApiError('Forbidden', 403);
  }

  const payload: LeaveHolidayInsert = {
    created_by: user?.id,
    description: normalizeNullableText(holidayBody.description),
    holiday_date: holidayBody.holiday_date ?? '',
    is_optional: holidayBody.is_optional ?? false,
    name: holidayBody.name?.trim() ?? '',
    organization_id: context.organizationId,
    updated_by: user?.id,
  };

  const { data, error } = await supabaseAdmin
    .from('leave_holidays')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Holiday created successfully', data);
});

const updateLeaveHolidayController = catchAsync(
  async ({ body, params, user }) => {
    const context = await getRequiredLeaveContext(user?.id);
    const holidayBody = body as LeaveHolidayBody;
    const holidayId = params?.holidayId;
    const supabaseAdmin = getSupabaseServerAdminClient<Database>();

    if (!context.permissions.canManageHolidays) {
      throw new ApiError('Forbidden', 403);
    }

    if (!holidayId) {
      throw new ApiError('Holiday id is required', 400);
    }

    const payload: LeaveHolidayUpdate = {
      description:
        holidayBody.description === undefined
          ? undefined
          : normalizeNullableText(holidayBody.description),
      holiday_date: holidayBody.holiday_date,
      is_optional: holidayBody.is_optional,
      name: holidayBody.name?.trim(),
      updated_by: user?.id,
    };

    const { data, error } = await supabaseAdmin
      .from('leave_holidays')
      .update(payload)
      .eq('organization_id', context.organizationId)
      .eq('id', holidayId)
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Holiday updated successfully', data);
  },
);

const deleteLeaveHolidayController = catchAsync(async ({ params, user }) => {
  const context = await getRequiredLeaveContext(user?.id);
  const holidayId = params?.holidayId;
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  if (!context.permissions.canManageHolidays) {
    throw new ApiError('Forbidden', 403);
  }

  if (!holidayId) {
    throw new ApiError('Holiday id is required', 400);
  }

  const { error } = await supabaseAdmin
    .from('leave_holidays')
    .delete()
    .eq('organization_id', context.organizationId)
    .eq('id', holidayId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Holiday deleted successfully');
});

export {
  createLeaveHolidayController,
  deleteLeaveHolidayController,
  listLeaveHolidaysController,
  updateLeaveHolidayController,
};
