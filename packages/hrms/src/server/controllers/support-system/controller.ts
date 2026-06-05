/* eslint-disable @typescript-eslint/no-explicit-any */
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
  requireEmployeePermission,
} from '../employees/controller.helpers';

const moduleKey = 'hrms_support_system';

const requestSelect = `
  id,
  workspace_id,
  employee_id,
  category,
  subject,
  description,
  priority,
  status,
  response_message,
  resolved_at,
  created_at,
  updated_at,
  employee:employees!hr_requests_employee_id_fkey(
    id,
    employee_code,
    first_name,
    last_name,
    designation,
    work_email,
    department:departments!employees_department_id_fkey(name)
  )
`;

type ControllerContext = {
  hrms: any;
  supabaseAdmin: any;
  userId: string;
  workspaceId: string;
};

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

async function getContext(params: { request: Request; user: unknown }) {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const userId = getRouteUserId(params.user);

  if (!userId) {
    throw new ApiError('Unauthorized', 401);
  }

  const workspaceId = await getRequiredWorkspaceId({
    request: params.request as any,
    supabaseAdmin,
    userId,
  });

  return {
    hrms: getHrmsClient(supabaseAdmin),
    supabaseAdmin,
    userId,
    workspaceId,
  } satisfies ControllerContext;
}

async function requireSupportPermission(
  context: ControllerContext,
  featureKey: string,
  minAccessLevel: 'own' | 'team' | 'all' = 'team',
) {
  await requireEmployeePermission({
    featureKey,
    minAccessLevel,
    moduleKey,
    supabaseAdmin: context.supabaseAdmin,
    userId: context.userId,
    workspaceId: context.workspaceId,
  });
}

async function canUpdateSupport(context: ControllerContext) {
  try {
    await requireSupportPermission(context, 'update', 'team');
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 403) {
      return false;
    }

    throw error;
  }
}

function mapSupportRequest(request: any) {
  return {
    category: request.category,
    created_at: request.created_at,
    description: request.description,
    employee: {
      department_name: request.employee?.department?.name ?? null,
      designation: request.employee?.designation ?? null,
      employee_code: request.employee?.employee_code ?? '-',
      id: request.employee?.id ?? '',
      name:
        [request.employee?.first_name, request.employee?.last_name]
          .filter(Boolean)
          .join(' ') || 'Employee',
      work_email: request.employee?.work_email ?? '-',
    },
    id: request.id,
    priority: request.priority,
    resolved_at: request.resolved_at,
    response_message: request.response_message,
    status: request.status,
    subject: request.subject,
    updated_at: request.updated_at,
  };
}

function buildMetrics(requests: Array<ReturnType<typeof mapSupportRequest>>) {
  return [
    {
      hint: 'Tickets that still need HR action.',
      label: 'Open Requests',
      value: requests.filter((request) => request.status === 'open').length,
    },
    {
      hint: 'Requests currently being worked on by the HR team.',
      label: 'In Progress',
      value: requests.filter((request) => request.status === 'in_progress')
        .length,
    },
    {
      hint: 'Urgent tickets marked with the highest priority.',
      label: 'Urgent Tickets',
      value: requests.filter((request) => request.priority === 'urgent').length,
    },
    {
      hint: 'Resolved or closed requests across the workspace.',
      label: 'Resolved',
      value: requests.filter((request) =>
        ['resolved', 'closed'].includes(request.status),
      ).length,
    },
  ];
}

const listSupportSystemDashboardController = catchAsync(
  async ({ request, user }) => {
    const context = await getContext({ request, user });

    await requireSupportPermission(context, 'view', 'team');
    const canUpdate = await canUpdateSupport(context);

    const { data, error } = await context.hrms
      .from('hr_requests')
      .select(requestSelect)
      .eq('workspace_id', context.workspaceId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new ApiError(error.message, 400);
    }

    const requests = ((data ?? []) as any[]).map(mapSupportRequest);

    return successDataResponse(
      'Support system dashboard fetched successfully',
      {
        metrics: buildMetrics(requests),
        permissions: {
          accessLevel: 'team',
          canUpdate,
          canView: true,
        },
        requests,
      },
    );
  },
);

const updateSupportSystemRequestController = catchAsync(
  async ({ body, params, request, user }) => {
    const context = await getContext({ request, user });
    const requestId = params?.requestId;

    if (!requestId) {
      throw new ApiError('Request id is required', 400);
    }

    await requireSupportPermission(context, 'update', 'team');

    const { data: existingRequest, error: existingRequestError } =
      await context.hrms
        .from('hr_requests')
        .select('id, status, priority')
        .eq('workspace_id', context.workspaceId)
        .eq('id', requestId)
        .maybeSingle();

    if (existingRequestError) {
      throw new ApiError(existingRequestError.message, 400);
    }

    if (!existingRequest) {
      throw new ApiError('Support request not found', 404);
    }

    const requestBody = (body ?? {}) as Record<string, unknown>;
    const nextStatus =
      (requestBody.status as string | undefined) ?? existingRequest.status;
    const nextPriority =
      (requestBody.priority as string | undefined) ?? existingRequest.priority;
    const nextResponseMessage =
      requestBody.response_message === undefined
        ? undefined
        : normalizeText(requestBody.response_message);

    const updatePayload: Record<string, string | null> = {
      priority: nextPriority,
      resolved_at:
        nextStatus === 'resolved' || nextStatus === 'closed'
          ? new Date().toISOString()
          : null,
      status: nextStatus,
      updated_by: context.userId,
    };

    if (nextResponseMessage !== undefined) {
      updatePayload.response_message = nextResponseMessage;
    }

    const { data, error } = await context.hrms
      .from('hr_requests')
      .update(updatePayload)
      .eq('workspace_id', context.workspaceId)
      .eq('id', requestId)
      .select(requestSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse(
      'Support request updated successfully',
      mapSupportRequest(data),
    );
  },
);

export {
  listSupportSystemDashboardController,
  updateSupportSystemRequestController,
};
