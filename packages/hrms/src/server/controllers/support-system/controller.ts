/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import { requirePermission } from '~/lib/server/rbac';
import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '~/utils/response-handler';

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

const listSupportSystemDashboardController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient();
  const organizationId = await getCurrentUserOrganizationId(user?.id);

  if (!organizationId) {
    throw new ApiError('Organization not found for user', 404);
  }

  const viewPermission = await requirePermission({
    accountId: user!.id,
    featureKey: 'view',
    minAccessLevel: 'team',
    moduleKey: 'support_system',
    organizationId,
  });

  let canUpdate = false;
  try {
    await requirePermission({
      accountId: user!.id,
      featureKey: 'update',
      minAccessLevel: 'team',
      moduleKey: 'support_system',
      organizationId,
    });
    canUpdate = true;
  } catch (error) {
    if (!(error instanceof ApiError) || error.statusCode !== 403) {
      throw error;
    }
  }

  const { data, error } = await (supabaseAdmin as any)
    .from('hr_requests')
    .select(
      `
      id,
      category,
      subject,
      description,
      priority,
      status,
      response_message,
      created_at,
      updated_at,
      resolved_at,
      employee:employees!hr_requests_employee_id_fkey(
        id,
        employee_code,
        first_name,
        last_name,
        designation,
        work_email,
        department:departments!employees_department_id_fkey(name)
      )
    `,
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new ApiError(error.message, 400);
  }

  const requests = ((data ?? []) as any[]).map((request) => ({
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
  }));

  const metrics = [
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
      hint: 'Resolved or closed requests across the organization.',
      label: 'Resolved',
      value: requests.filter((request) =>
        ['resolved', 'closed'].includes(request.status),
      ).length,
    },
  ];

  return successDataResponse('Support system dashboard fetched successfully', {
    metrics,
    permissions: {
      accessLevel: viewPermission.permission.accessLevel,
      canUpdate,
      canView: true,
    },
    requests,
  });
});

const updateSupportSystemRequestController = catchAsync(
  async ({ body, params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient();
    const organizationId = await getCurrentUserOrganizationId(user?.id);
    const requestId = params?.requestId;

    if (!organizationId) {
      throw new ApiError('Organization not found for user', 404);
    }

    if (!requestId) {
      throw new ApiError('Request id is required', 400);
    }

    await requirePermission({
      accountId: user!.id,
      featureKey: 'update',
      minAccessLevel: 'team',
      moduleKey: 'support_system',
      organizationId,
    });

    const requestBody = (body ?? {}) as Record<string, unknown>;

    const { data: existingRequest, error: existingRequestError } = await (
      supabaseAdmin as any
    )
      .from('hr_requests')
      .select('id, status, priority')
      .eq('organization_id', organizationId)
      .eq('id', requestId)
      .maybeSingle();

    if (existingRequestError) {
      throw new ApiError(existingRequestError.message, 400);
    }

    if (!existingRequest) {
      throw new ApiError('Support request not found', 404);
    }

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
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };

    if (nextResponseMessage !== undefined) {
      updatePayload.response_message = nextResponseMessage;
    }

    const { data, error } = await (supabaseAdmin as any)
      .from('hr_requests')
      .update(updatePayload)
      .eq('organization_id', organizationId)
      .eq('id', requestId)
      .select(
        `
      id,
      category,
      subject,
      description,
      priority,
      status,
      response_message,
      created_at,
      updated_at,
      resolved_at,
      employee:employees!hr_requests_employee_id_fkey(
        id,
        employee_code,
        first_name,
        last_name,
        designation,
        work_email,
        department:departments!employees_department_id_fkey(name)
      )
    `,
      )
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Support request updated successfully', {
      category: data.category,
      created_at: data.created_at,
      description: data.description,
      employee: {
        department_name: data.employee?.department?.name ?? null,
        designation: data.employee?.designation ?? null,
        employee_code: data.employee?.employee_code ?? '-',
        id: data.employee?.id ?? '',
        name:
          [data.employee?.first_name, data.employee?.last_name]
            .filter(Boolean)
            .join(' ') || 'Employee',
        work_email: data.employee?.work_email ?? '-',
      },
      id: data.id,
      priority: data.priority,
      resolved_at: data.resolved_at,
      response_message: data.response_message,
      status: data.status,
      subject: data.subject,
      updated_at: data.updated_at,
    });
  },
);

export {
  listSupportSystemDashboardController,
  updateSupportSystemRequestController,
};
