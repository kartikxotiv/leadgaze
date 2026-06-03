import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import { ApiError } from '~/utils/response-handler';

import { getLeaveContext } from './utils';
import { leaveRequestSelect, type LeaveRequestRelationRow } from './controller.types';

async function getRequiredLeaveContext(userId?: string) {
  const organizationId = await getCurrentUserOrganizationId(userId);

  if (!organizationId || !userId) {
    throw new ApiError('Organization not found for user', 404);
  }

  return getLeaveContext({
    accountId: userId,
    organizationId,
  });
}

async function getLeaveTypeOrThrow(params: {
  leaveTypeId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  const { data, error } = await supabaseAdmin
    .from('leave_types')
    .select('*')
    .eq('organization_id', params.organizationId)
    .eq('id', params.leaveTypeId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError('Leave type not found', 404);
  }

  return data;
}

async function getLeaveRequestOrThrow(params: {
  organizationId: string;
  requestId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .select(leaveRequestSelect)
    .eq('organization_id', params.organizationId)
    .eq('id', params.requestId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError('Leave request not found', 404);
  }

  return data as LeaveRequestRelationRow;
}

export { getLeaveRequestOrThrow, getLeaveTypeOrThrow, getRequiredLeaveContext };
