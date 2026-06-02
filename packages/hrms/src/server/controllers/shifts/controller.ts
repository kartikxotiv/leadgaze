import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import { getShiftId, requireAdminRole } from './utils';

type ShiftInsert = Database['public']['Tables']['shifts']['Insert'];
type ShiftUpdate = Database['public']['Tables']['shifts']['Update'];

type ShiftBody = {
  end_time?: string | null;
  grace_minutes?: number | null;
  is_active?: boolean;
  name?: string | null;
  start_time?: string | null;
};

const listShiftsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name', { ascending: true });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Shifts fetched successfully', data ?? []);
});

const createShiftController = catchAsync(async ({ body, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const shiftBody = body as ShiftBody;
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  await requireAdminRole({ accountId: user!.id, organizationId });

  const payload: ShiftInsert = {
    organization_id: organizationId,
    name: shiftBody.name?.trim() ?? '',
    start_time: shiftBody.start_time ?? '09:00:00',
    end_time: shiftBody.end_time ?? '18:00:00',
    grace_minutes: shiftBody.grace_minutes ?? 0,
    is_active: shiftBody.is_active ?? true,
    created_by: user?.id,
    updated_by: user?.id,
  };

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Shift created successfully', data);
});

const updateShiftController = catchAsync(async ({ body, params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const shiftBody = body as ShiftBody;
  const organizationId = await getCurrentUserOrganizationId(user?.id);
  const shiftId = getShiftId(params);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  await requireAdminRole({ accountId: user!.id, organizationId });

  const payload: ShiftUpdate = {
    name: shiftBody.name?.trim(),
    start_time: shiftBody.start_time ?? undefined,
    end_time: shiftBody.end_time ?? undefined,
    grace_minutes: shiftBody.grace_minutes ?? undefined,
    is_active: shiftBody.is_active,
    updated_by: user?.id,
  };

  const { data, error } = await supabaseAdmin
    .from('shifts')
    .update(payload)
    .eq('organization_id', organizationId)
    .eq('id', shiftId)
    .select('*')
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Shift updated successfully', data);
});

const deleteShiftController = catchAsync(async ({ params, user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const organizationId = await getCurrentUserOrganizationId(user?.id);
  const shiftId = getShiftId(params);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  await requireAdminRole({ accountId: user!.id, organizationId });

  const { error } = await supabaseAdmin
    .from('shifts')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', shiftId);

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse('Shift deleted successfully');
});

export {
  createShiftController,
  deleteShiftController,
  listShiftsController,
  updateShiftController,
};
