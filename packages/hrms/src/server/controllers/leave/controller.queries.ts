import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError } from '../../../utils/response-handler';
import {
  getHrmsClient,
  getRequiredWorkspaceId,
} from '../employees/controller.helpers';
import {
  type LeaveRequestRelationRow,
  type LeaveTypeRow,
  leaveRequestSelect,
} from './controller.types';
import { getLeaveContext } from './utils';

async function getRequiredLeaveContext(params: {
  request?: {
    cookies?: {
      get: (name: string) => { value?: string } | undefined;
    };
  };
  userId?: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const workspaceId = await getRequiredWorkspaceId({
    request: params.request,
    supabaseAdmin,
    userId: params.userId,
  });

  return getLeaveContext({
    accountId: params.userId!,
    supabaseAdmin,
    workspaceId,
  });
}

async function getLeaveTypeOrThrow(params: {
  leaveTypeId: string;
  organizationId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const { data, error } = await getHrmsClient(supabaseAdmin)
    .from('leave_types')
    .select('*')
    .eq('workspace_id', params.organizationId)
    .eq('id', params.leaveTypeId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError('Leave type not found', 404);
  }

  return data as LeaveTypeRow;
}

async function getLeaveRequestOrThrow(params: {
  organizationId: string;
  requestId: string;
}) {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const { data, error } = await getHrmsClient(supabaseAdmin)
    .from('leave_requests')
    .select(leaveRequestSelect)
    .eq('workspace_id', params.organizationId)
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
