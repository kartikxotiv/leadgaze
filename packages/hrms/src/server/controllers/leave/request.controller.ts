import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import type { Database } from '~/lib/database.types';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

import {
  computeLeaveDayCount,
  getCalendarYear,
  normalizeNullableText,
} from './utils';
import { buildBalances, canApproveRequest, decorateRequest } from './controller.helpers';
import {
  getLeaveRequestOrThrow,
  getLeaveTypeOrThrow,
  getRequiredLeaveContext,
} from './controller.queries';
import {
  leaveRequestSelect,
  type LeaveRequestActionBody,
  type LeaveRequestBody,
  type LeaveRequestInsert,
  type LeaveRequestRelationRow,
  type LeaveRequestUpdate,
} from './controller.types';

const createLeaveRequestController = catchAsync(async ({ body, user }) => {
  const context = await getRequiredLeaveContext(user?.id);
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();
  const leaveBody = body as LeaveRequestBody;

  if (!context.permissions.canApply || !context.employee) {
    throw new ApiError('Forbidden', 403);
  }

  const leaveType = await getLeaveTypeOrThrow({
    leaveTypeId: leaveBody.leave_type_id,
    organizationId: context.organizationId,
  });

  if (!leaveType.is_active) {
    throw new ApiError('Selected leave type is inactive', 400);
  }

  const dayCount = await computeLeaveDayCount({
    fromDate: leaveBody.from_date,
    organizationId: context.organizationId,
    supabaseAdmin,
    toDate: leaveBody.to_date,
  });
  const year = getCalendarYear(leaveBody.from_date);

  const { data: overlappingRequests, error: overlappingError } = await supabaseAdmin
    .from('leave_requests')
    .select('id')
    .eq('organization_id', context.organizationId)
    .eq('employee_id', context.employee.id)
    .in('status', ['pending', 'approved'])
    .lte('from_date', leaveBody.to_date)
    .gte('to_date', leaveBody.from_date)
    .limit(1);

  if (overlappingError) {
    throw new ApiError(overlappingError.message, 400);
  }

  if ((overlappingRequests ?? []).length > 0) {
    throw new ApiError(
      'A leave request already exists for the selected dates',
      400,
    );
  }

  const { data: yearRequests, error: yearRequestsError } = await supabaseAdmin
    .from('leave_requests')
    .select(leaveRequestSelect)
    .eq('organization_id', context.organizationId)
    .eq('employee_id', context.employee.id);

  if (yearRequestsError) {
    throw new ApiError(yearRequestsError.message, 400);
  }

  const balance = buildBalances({
    leaveTypes: [leaveType],
    requests: (yearRequests ?? []) as LeaveRequestRelationRow[],
    year,
  })[0];

  if (!balance || balance.available < dayCount) {
    throw new ApiError('Insufficient leave balance for this request', 400);
  }

  const payload: LeaveRequestInsert = {
    created_by: user?.id,
    day_count: dayCount,
    employee_id: context.employee.id,
    from_date: leaveBody.from_date,
    leave_type_id: leaveType.id,
    organization_id: context.organizationId,
    reason: normalizeNullableText(leaveBody.reason),
    to_date: leaveBody.to_date,
    updated_by: user?.id,
  };

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .insert(payload)
    .select(leaveRequestSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(
    'Leave request submitted successfully',
    decorateRequest(context, data as LeaveRequestRelationRow),
  );
});

const updateLeaveRequestController = catchAsync(async ({ body, params, user }) => {
  const context = await getRequiredLeaveContext(user?.id);
  const requestId = params?.requestId;
  const actionBody = body as LeaveRequestActionBody;
  const supabaseAdmin = getSupabaseServerAdminClient<Database>();

  if (!requestId) {
    throw new ApiError('Leave request id is required', 400);
  }

  const leaveRequest = await getLeaveRequestOrThrow({
    organizationId: context.organizationId,
    requestId,
  });

  const payload: LeaveRequestUpdate = {
    decision_note: normalizeNullableText(actionBody.decision_note),
    updated_by: user?.id,
  };

  if (actionBody.action === 'cancel') {
    if (!context.employee || leaveRequest.employee_id !== context.employee.id) {
      throw new ApiError('Forbidden', 403);
    }

    if (leaveRequest.status !== 'pending') {
      throw new ApiError('Only pending requests can be cancelled', 400);
    }

    payload.status = 'cancelled';
    payload.decision_at = new Date().toISOString();
    payload.approver_employee_id = null;
  } else {
    if (!canApproveRequest(context, leaveRequest)) {
      throw new ApiError('Forbidden', 403);
    }

    payload.status = actionBody.action === 'approve' ? 'approved' : 'rejected';
    payload.decision_at = new Date().toISOString();
    payload.approver_employee_id = context.employee?.id ?? null;
  }

  const { data, error } = await supabaseAdmin
    .from('leave_requests')
    .update(payload)
    .eq('organization_id', context.organizationId)
    .eq('id', requestId)
    .select(leaveRequestSelect)
    .single();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return successDataResponse(
    'Leave request updated successfully',
    decorateRequest(context, data as LeaveRequestRelationRow),
  );
});

export { createLeaveRequestController, updateLeaveRequestController };
