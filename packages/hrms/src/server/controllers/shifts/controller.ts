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
} from '../employees/controller.helpers';
import { getShiftId, requireAdminRole } from './utils';

type ShiftInsert = Record<string, unknown>;
type ShiftUpdate = Record<string, unknown>;

type ShiftBody = {
  end_time?: string | null;
  grace_minutes?: number | null;
  is_active?: boolean;
  name?: string | null;
  start_time?: string | null;
};

const listShiftsController = catchAsync(async ({ request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });

  const { data, error } = await hrms
    .from('shifts')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name', { ascending: true });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(
    'Shifts fetched successfully',
    ((data ?? []) as Array<{ workspace_id: string }>).map(addOrganizationAlias),
  );
});

const createShiftController = catchAsync(async ({ body, request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const shiftBody = body as ShiftBody;
  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });

  await requireAdminRole({
    accountId: userId!,
    supabaseAdmin,
    workspaceId,
  });

  const payload: ShiftInsert = {
    workspace_id: workspaceId,
    name: shiftBody.name?.trim() ?? '',
    start_time: shiftBody.start_time ?? '09:00:00',
    end_time: shiftBody.end_time ?? '18:00:00',
    grace_minutes: shiftBody.grace_minutes ?? 0,
    is_active: shiftBody.is_active ?? true,
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await hrms
    .from('shifts')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(
    'Shift created successfully',
    addOrganizationAlias(data as { workspace_id: string }),
  );
});

const updateShiftController = catchAsync(
  async ({ body, params, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const hrms = getHrmsClient(supabaseAdmin);
    const userId = getRouteUserId(user);
    const shiftBody = body as ShiftBody;
    const workspaceId = await getRequiredWorkspaceId({
      request,
      supabaseAdmin,
      userId,
    });
    const shiftId = getShiftId(params);

    await requireAdminRole({
      accountId: userId!,
      supabaseAdmin,
      workspaceId,
    });

    const payload: ShiftUpdate = {
      name: shiftBody.name?.trim(),
      start_time: shiftBody.start_time ?? undefined,
      end_time: shiftBody.end_time ?? undefined,
      grace_minutes: shiftBody.grace_minutes ?? undefined,
      is_active: shiftBody.is_active,
      updated_by: userId,
    };

    const { data, error } = await hrms
      .from('shifts')
      .update(payload)
      .eq('workspace_id', workspaceId)
      .eq('id', shiftId)
      .select('*')
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(
      'Shift updated successfully',
      addOrganizationAlias(data as { workspace_id: string }),
    );
  },
);

const deleteShiftController = catchAsync(async ({ params, request, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const hrms = getHrmsClient(supabaseAdmin);
  const userId = getRouteUserId(user);
  const workspaceId = await getRequiredWorkspaceId({
    request,
    supabaseAdmin,
    userId,
  });
  const shiftId = getShiftId(params);

  await requireAdminRole({
    accountId: userId!,
    supabaseAdmin,
    workspaceId,
  });

  const { error } = await hrms
    .from('shifts')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('id', shiftId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Shift deleted successfully', null);
});

function addOrganizationAlias<T extends { workspace_id: string }>(item: T) {
  return {
    ...item,
    organization_id: item.workspace_id,
  };
}

export {
  createShiftController,
  deleteShiftController,
  listShiftsController,
  updateShiftController,
};
