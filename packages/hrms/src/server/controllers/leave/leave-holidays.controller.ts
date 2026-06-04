import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../utils/response-handler';
import { getHrmsClient, getRouteUserId } from '../employees/controller.helpers';
import { getRequiredLeaveContext } from './controller.queries';
import {
  type LeaveHolidayBody,
  type LeaveHolidayInsert,
  type LeaveHolidayUpdate,
} from './controller.types';
import { normalizeNullableText } from './utils';

const listLeaveHolidaysController = catchAsync(async ({ request, user }) => {
  const userId = getRouteUserId(user);
  const context = await getRequiredLeaveContext({
    request,
    userId,
  });
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);

  if (!context.permissions.canViewHolidays) {
    throw new ApiError('Forbidden', 403);
  }

  const { data, error } = await hrms
    .from('leave_holidays')
    .select('*')
    .eq('workspace_id', context.organizationId)
    .order('holiday_date', { ascending: true });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(
    'Leave holidays fetched successfully',
    ((data ?? []) as Array<{ workspace_id: string }>).map(addOrganizationAlias),
  );
});

const createLeaveHolidayController = catchAsync(
  async ({ body, request, user }) => {
    const userId = getRouteUserId(user);
    const context = await getRequiredLeaveContext({
      request,
      userId,
    });
    const holidayBody = body as LeaveHolidayBody;
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);

    if (!context.permissions.canManageHolidays) {
      throw new ApiError('Forbidden', 403);
    }

    const payload: LeaveHolidayInsert = {
      created_by: userId,
      description: normalizeNullableText(holidayBody.description),
      holiday_date: holidayBody.holiday_date ?? '',
      is_optional: holidayBody.is_optional ?? false,
      name: holidayBody.name?.trim() ?? '',
      workspace_id: context.organizationId,
      updated_by: userId,
    };

    const { data, error } = await hrms
      .from('leave_holidays')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(
      'Holiday created successfully',
      addOrganizationAlias(data as { workspace_id: string }),
    );
  },
);

const updateLeaveHolidayController = catchAsync(
  async ({ body, params, request, user }) => {
    const userId = getRouteUserId(user);
    const context = await getRequiredLeaveContext({
      request,
      userId,
    });
    const holidayBody = body as LeaveHolidayBody;
    const holidayId = params?.holidayId;
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);

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
      updated_by: userId,
    };

    const { data, error } = await hrms
      .from('leave_holidays')
      .update(payload)
      .eq('workspace_id', context.organizationId)
      .eq('id', holidayId)
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(
      'Holiday updated successfully',
      addOrganizationAlias(data as { workspace_id: string }),
    );
  },
);

const deleteLeaveHolidayController = catchAsync(
  async ({ params, request, user }) => {
    const userId = getRouteUserId(user);
    const context = await getRequiredLeaveContext({
      request,
      userId,
    });
    const holidayId = params?.holidayId;
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);

    if (!context.permissions.canManageHolidays) {
      throw new ApiError('Forbidden', 403);
    }

    if (!holidayId) {
      throw new ApiError('Holiday id is required', 400);
    }

    const { error } = await hrms
      .from('leave_holidays')
      .delete()
      .eq('workspace_id', context.organizationId)
      .eq('id', holidayId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Holiday deleted successfully');
  },
);

function addOrganizationAlias<T extends { workspace_id: string }>(item: T) {
  return {
    ...item,
    organization_id: item.workspace_id,
  };
}

export {
  createLeaveHolidayController,
  deleteLeaveHolidayController,
  listLeaveHolidaysController,
  updateLeaveHolidayController,
};
