/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import {
  ApiError,
  catchAsync,
  successDataResponse,
} from '../../../../utils/response-handler';
import {
  ensureOrganizationRecord,
  getClosedAt,
  getRecruitmentHrmsClient,
  getRecruitmentUserId,
  getRequiredOrganizationId,
  normalizeNullable,
  requireRecruitmentPermission,
  requisitionSelect,
} from './shared';

export const createRecruitmentRequisitionController = catchAsync(
  async ({ body, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const hrms = getRecruitmentHrmsClient(supabaseAdmin);
    const userId = getRecruitmentUserId(user);
    const organizationId = await getRequiredOrganizationId({
      request,
      supabaseAdmin,
      userId,
    });
    const data = body as Record<string, any>;

    await requireRecruitmentPermission({
      featureKey: 'create',
      minAccessLevel: 'team',
      supabaseAdmin,
      userId,
      workspaceId: organizationId,
    });

    await Promise.all([
      ensureOrganizationRecord({
        entityLabel: 'Department',
        id: normalizeNullable(data.department_id),
        organizationId,
        supabaseAdmin,
        table: 'departments',
      }),
      ensureOrganizationRecord({
        entityLabel: 'Requested by employee',
        id: normalizeNullable(data.requested_by_employee_id),
        organizationId,
        supabaseAdmin,
        table: 'employees',
      }),
      ensureOrganizationRecord({
        entityLabel: 'Owner employee',
        id: normalizeNullable(data.owner_employee_id),
        organizationId,
        supabaseAdmin,
        table: 'employees',
      }),
      ensureOrganizationRecord({
        entityLabel: 'Hiring manager',
        id: normalizeNullable(data.hiring_manager_employee_id),
        organizationId,
        supabaseAdmin,
        table: 'employees',
      }),
    ]);

    const payload = {
      closed_at: getClosedAt(data.status),
      compensation_max:
        data.compensation_max === null || data.compensation_max === undefined
          ? null
          : Number(data.compensation_max),
      compensation_min:
        data.compensation_min === null || data.compensation_min === undefined
          ? null
          : Number(data.compensation_min),
      created_by: userId ?? null,
      department_id: normalizeNullable(data.department_id),
      description: normalizeNullable(data.description),
      employment_type: data.employment_type,
      hiring_manager_employee_id: normalizeNullable(
        data.hiring_manager_employee_id,
      ),
      location: normalizeNullable(data.location),
      openings: Number(data.openings),
      workspace_id: organizationId,
      owner_employee_id: normalizeNullable(data.owner_employee_id),
      priority: data.priority,
      requested_by_employee_id: normalizeNullable(
        data.requested_by_employee_id,
      ),
      requisition_code: String(data.requisition_code).trim().toUpperCase(),
      status: data.status,
      target_start_date: normalizeNullable(data.target_start_date),
      title: String(data.title).trim(),
      updated_by: userId ?? null,
    };

    const { data: created, error } = await hrms
      .from('recruitment_requisitions')
      .insert(payload)
      .select(requisitionSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Requisition created successfully', created);
  },
);

export const updateRecruitmentRequisitionController = catchAsync(
  async ({ body, params, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const hrms = getRecruitmentHrmsClient(supabaseAdmin);
    const userId = getRecruitmentUserId(user);
    const organizationId = await getRequiredOrganizationId({
      request,
      supabaseAdmin,
      userId,
    });
    const requisitionId = params?.id;
    const data = body as Record<string, any>;

    if (!requisitionId) {
      throw new ApiError('Requisition id is required', 400);
    }

    await requireRecruitmentPermission({
      featureKey: 'edit',
      minAccessLevel: 'team',
      supabaseAdmin,
      userId,
      workspaceId: organizationId,
    });

    await ensureOrganizationRecord({
      entityLabel: 'Requisition',
      id: requisitionId,
      organizationId,
      supabaseAdmin,
      table: 'recruitment_requisitions',
    });

    await Promise.all([
      ensureOrganizationRecord({
        entityLabel: 'Department',
        id:
          data.department_id === undefined
            ? null
            : normalizeNullable(data.department_id),
        organizationId,
        supabaseAdmin,
        table: 'departments',
      }),
      ensureOrganizationRecord({
        entityLabel: 'Requested by employee',
        id:
          data.requested_by_employee_id === undefined
            ? null
            : normalizeNullable(data.requested_by_employee_id),
        organizationId,
        supabaseAdmin,
        table: 'employees',
      }),
      ensureOrganizationRecord({
        entityLabel: 'Owner employee',
        id:
          data.owner_employee_id === undefined
            ? null
            : normalizeNullable(data.owner_employee_id),
        organizationId,
        supabaseAdmin,
        table: 'employees',
      }),
      ensureOrganizationRecord({
        entityLabel: 'Hiring manager',
        id:
          data.hiring_manager_employee_id === undefined
            ? null
            : normalizeNullable(data.hiring_manager_employee_id),
        organizationId,
        supabaseAdmin,
        table: 'employees',
      }),
    ]);

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: userId ?? null,
    };

    if (data.department_id !== undefined) {
      payload.department_id = normalizeNullable(data.department_id);
    }
    if (data.requested_by_employee_id !== undefined) {
      payload.requested_by_employee_id = normalizeNullable(
        data.requested_by_employee_id,
      );
    }
    if (data.owner_employee_id !== undefined) {
      payload.owner_employee_id = normalizeNullable(data.owner_employee_id);
    }
    if (data.hiring_manager_employee_id !== undefined) {
      payload.hiring_manager_employee_id = normalizeNullable(
        data.hiring_manager_employee_id,
      );
    }
    if (data.requisition_code !== undefined) {
      payload.requisition_code = String(data.requisition_code)
        .trim()
        .toUpperCase();
    }
    if (data.title !== undefined) {
      payload.title = String(data.title).trim();
    }
    if (data.employment_type !== undefined) {
      payload.employment_type = data.employment_type;
    }
    if (data.location !== undefined) {
      payload.location = normalizeNullable(data.location);
    }
    if (data.priority !== undefined) {
      payload.priority = data.priority;
    }
    if (data.openings !== undefined) {
      payload.openings = Number(data.openings);
    }
    if (data.status !== undefined) {
      payload.closed_at = getClosedAt(data.status);
      payload.status = data.status;
    }
    if (data.target_start_date !== undefined) {
      payload.target_start_date = normalizeNullable(data.target_start_date);
    }
    if (data.description !== undefined) {
      payload.description = normalizeNullable(data.description);
    }
    if (data.compensation_min !== undefined) {
      payload.compensation_min =
        data.compensation_min === null ? null : Number(data.compensation_min);
    }
    if (data.compensation_max !== undefined) {
      payload.compensation_max =
        data.compensation_max === null ? null : Number(data.compensation_max);
    }

    const { data: updated, error } = await hrms
      .from('recruitment_requisitions')
      .update(payload)
      .eq('workspace_id', organizationId)
      .eq('id', requisitionId)
      .select(requisitionSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Requisition updated successfully', updated);
  },
);

export const deleteRecruitmentRequisitionController = catchAsync(
  async ({ params, request, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const hrms = getRecruitmentHrmsClient(supabaseAdmin);
    const userId = getRecruitmentUserId(user);
    const organizationId = await getRequiredOrganizationId({
      request,
      supabaseAdmin,
      userId,
    });
    const requisitionId = params?.id;

    if (!requisitionId) {
      throw new ApiError('Requisition id is required', 400);
    }

    await requireRecruitmentPermission({
      featureKey: 'delete',
      minAccessLevel: 'team',
      supabaseAdmin,
      userId,
      workspaceId: organizationId,
    });

    await ensureOrganizationRecord({
      entityLabel: 'Requisition',
      id: requisitionId,
      organizationId,
      supabaseAdmin,
      table: 'recruitment_requisitions',
    });

    const { error } = await hrms
      .from('recruitment_requisitions')
      .delete()
      .eq('workspace_id', organizationId)
      .eq('id', requisitionId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Requisition deleted successfully');
  },
);
