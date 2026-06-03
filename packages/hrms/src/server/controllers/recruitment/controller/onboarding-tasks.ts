/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';
import type { RecruitmentOnboardingStatus } from '~/types/recruitment.type';

import {
  ensureOrganizationRecord,
  getCompletedAt,
  getRequiredOrganizationId,
  normalizeNullable,
  onboardingSelect,
  touchCandidate,
} from './shared';

export const createRecruitmentOnboardingTaskController = catchAsync(
  async ({ body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const data = body as Record<string, any>;

    await ensureOrganizationRecord({
      entityLabel: 'Candidate',
      id: data.candidate_id,
      organizationId,
      supabaseAdmin,
      table: 'recruitment_candidates',
    });
    await ensureOrganizationRecord({
      entityLabel: 'Task owner',
      id: normalizeNullable(data.owner_employee_id),
      organizationId,
      supabaseAdmin,
      table: 'employees',
    });

    if (normalizeNullable(data.offer_id)) {
      const offer = await ensureOrganizationRecord({
        entityLabel: 'Offer',
        id: normalizeNullable(data.offer_id),
        organizationId,
        select: 'id, candidate_id',
        supabaseAdmin,
        table: 'recruitment_offers',
      });

      if (offer.candidate_id !== data.candidate_id) {
        throw new ApiError('Selected offer does not belong to this candidate', 400);
      }
    }

    const status = data.status as RecruitmentOnboardingStatus;

    const { data: created, error } = await supabaseAdmin
      .from('recruitment_onboarding_tasks')
      .insert({
        candidate_id: data.candidate_id,
        completed_at: getCompletedAt(status),
        created_by: user?.id ?? null,
        description: normalizeNullable(data.description),
        due_date: normalizeNullable(data.due_date),
        offer_id: normalizeNullable(data.offer_id),
        organization_id: organizationId,
        owner_employee_id: normalizeNullable(data.owner_employee_id),
        status,
        title: String(data.title).trim(),
        updated_by: user?.id ?? null,
      })
      .select(onboardingSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    await touchCandidate({
      candidateId: data.candidate_id,
      supabaseAdmin,
      userId: user?.id,
    });

    return successDataResponse('Onboarding task saved successfully', created);
  },
);

export const updateRecruitmentOnboardingTaskController = catchAsync(
  async ({ body, params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const taskId = params?.id;
    const data = body as Record<string, any>;

    if (!taskId) {
      throw new ApiError('Onboarding task id is required', 400);
    }

    const existingTask = await ensureOrganizationRecord({
      entityLabel: 'Onboarding task',
      id: taskId,
      organizationId,
      select: 'id, candidate_id, offer_id',
      supabaseAdmin,
      table: 'recruitment_onboarding_tasks',
    });

    let candidateId = existingTask.candidate_id;

    if (data.candidate_id !== undefined) {
      await ensureOrganizationRecord({
        entityLabel: 'Candidate',
        id: data.candidate_id,
        organizationId,
        supabaseAdmin,
        table: 'recruitment_candidates',
      });
      candidateId = data.candidate_id;
    }

    if (data.owner_employee_id !== undefined) {
      await ensureOrganizationRecord({
        entityLabel: 'Task owner',
        id: normalizeNullable(data.owner_employee_id),
        organizationId,
        supabaseAdmin,
        table: 'employees',
      });
    }

    if (data.offer_id !== undefined && normalizeNullable(data.offer_id)) {
      const offer = await ensureOrganizationRecord({
        entityLabel: 'Offer',
        id: normalizeNullable(data.offer_id),
        organizationId,
        select: 'id, candidate_id',
        supabaseAdmin,
        table: 'recruitment_offers',
      });

      if (offer.candidate_id !== candidateId) {
        throw new ApiError('Selected offer does not belong to this candidate', 400);
      }
    }

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };

    if (data.candidate_id !== undefined) {
      payload.candidate_id = data.candidate_id;
    }
    if (data.offer_id !== undefined) {
      payload.offer_id = normalizeNullable(data.offer_id);
    }
    if (data.owner_employee_id !== undefined) {
      payload.owner_employee_id = normalizeNullable(data.owner_employee_id);
    }
    if (data.title !== undefined) {
      payload.title = String(data.title).trim();
    }
    if (data.description !== undefined) {
      payload.description = normalizeNullable(data.description);
    }
    if (data.due_date !== undefined) {
      payload.due_date = normalizeNullable(data.due_date);
    }
    if (data.status !== undefined) {
      payload.completed_at = getCompletedAt(data.status);
      payload.status = data.status;
    }

    const { data: updated, error } = await supabaseAdmin
      .from('recruitment_onboarding_tasks')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', taskId)
      .select(onboardingSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    await touchCandidate({
      candidateId,
      supabaseAdmin,
      userId: user?.id,
    });

    return successDataResponse('Onboarding task updated successfully', updated);
  },
);

export const deleteRecruitmentOnboardingTaskController = catchAsync(
  async ({ params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const taskId = params?.id;

    if (!taskId) {
      throw new ApiError('Onboarding task id is required', 400);
    }

    await ensureOrganizationRecord({
      entityLabel: 'Onboarding task',
      id: taskId,
      organizationId,
      supabaseAdmin,
      table: 'recruitment_onboarding_tasks',
    });

    const { error } = await supabaseAdmin
      .from('recruitment_onboarding_tasks')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', taskId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Onboarding task deleted successfully');
  },
);
