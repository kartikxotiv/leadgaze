/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';

import {
  ensureOrganizationRecord,
  feedbackSelect,
  getCurrentEmployeeId,
  getRequiredOrganizationId,
  interviewSelect,
  normalizeNullable,
  touchCandidate,
  updateCandidateStatus,
} from './shared';

export const createRecruitmentInterviewController = catchAsync(
  async ({ body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const data = body as Record<string, any>;

    const candidate = await ensureOrganizationRecord({
      entityLabel: 'Candidate',
      id: data.candidate_id,
      organizationId,
      select: 'id, requisition_id',
      supabaseAdmin,
      table: 'recruitment_candidates',
    });

    await ensureOrganizationRecord({
      entityLabel: 'Interviewer employee',
      id: normalizeNullable(data.interviewer_employee_id),
      organizationId,
      supabaseAdmin,
      table: 'employees',
    });

    const { data: created, error } = await supabaseAdmin
      .from('recruitment_interviews')
      .insert({
        candidate_id: data.candidate_id,
        created_by: user?.id ?? null,
        duration_minutes: Number(data.duration_minutes),
        interviewer_employee_id: normalizeNullable(data.interviewer_employee_id),
        location: normalizeNullable(data.location),
        meeting_link: normalizeNullable(data.meeting_link),
        organization_id: organizationId,
        outcome: normalizeNullable(data.outcome),
        requisition_id: candidate.requisition_id,
        round_type: data.round_type,
        scheduled_at: data.scheduled_at,
        status: data.status,
        title: String(data.title).trim(),
        updated_by: user?.id ?? null,
      })
      .select(interviewSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    if (data.status !== 'cancelled' && data.status !== 'no_show') {
      await updateCandidateStatus({
        candidateId: data.candidate_id,
        status: 'interview',
        supabaseAdmin,
        userId: user?.id,
      });
    } else {
      await touchCandidate({
        candidateId: data.candidate_id,
        supabaseAdmin,
        userId: user?.id,
      });
    }

    return successDataResponse('Interview scheduled successfully', created);
  },
);

export const updateRecruitmentInterviewController = catchAsync(
  async ({ body, params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const interviewId = params?.id;
    const data = body as Record<string, any>;

    if (!interviewId) {
      throw new ApiError('Interview id is required', 400);
    }

    const existingInterview = await ensureOrganizationRecord({
      entityLabel: 'Interview',
      id: interviewId,
      organizationId,
      select: 'id, candidate_id, requisition_id',
      supabaseAdmin,
      table: 'recruitment_interviews',
    });

    let requisitionId = existingInterview.requisition_id;
    let candidateId = existingInterview.candidate_id;

    if (data.candidate_id !== undefined) {
      const candidate = await ensureOrganizationRecord({
        entityLabel: 'Candidate',
        id: data.candidate_id,
        organizationId,
        select: 'id, requisition_id',
        supabaseAdmin,
        table: 'recruitment_candidates',
      });
      candidateId = candidate.id;
      requisitionId = candidate.requisition_id;
    }

    if (data.interviewer_employee_id !== undefined) {
      await ensureOrganizationRecord({
        entityLabel: 'Interviewer employee',
        id: normalizeNullable(data.interviewer_employee_id),
        organizationId,
        supabaseAdmin,
        table: 'employees',
      });
    }

    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };

    if (data.candidate_id !== undefined) {
      payload.candidate_id = candidateId;
      payload.requisition_id = requisitionId;
    }
    if (data.interviewer_employee_id !== undefined) {
      payload.interviewer_employee_id = normalizeNullable(data.interviewer_employee_id);
    }
    if (data.title !== undefined) {
      payload.title = String(data.title).trim();
    }
    if (data.round_type !== undefined) {
      payload.round_type = data.round_type;
    }
    if (data.scheduled_at !== undefined) {
      payload.scheduled_at = data.scheduled_at;
    }
    if (data.duration_minutes !== undefined) {
      payload.duration_minutes = Number(data.duration_minutes);
    }
    if (data.meeting_link !== undefined) {
      payload.meeting_link = normalizeNullable(data.meeting_link);
    }
    if (data.location !== undefined) {
      payload.location = normalizeNullable(data.location);
    }
    if (data.status !== undefined) {
      payload.status = data.status;
    }
    if (data.outcome !== undefined) {
      payload.outcome = normalizeNullable(data.outcome);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('recruitment_interviews')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', interviewId)
      .select(interviewSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    if (payload.status && payload.status !== 'cancelled' && payload.status !== 'no_show') {
      await updateCandidateStatus({
        candidateId,
        status: 'interview',
        supabaseAdmin,
        userId: user?.id,
      });
    } else {
      await touchCandidate({
        candidateId,
        supabaseAdmin,
        userId: user?.id,
      });
    }

    return successDataResponse('Interview updated successfully', updated);
  },
);

export const deleteRecruitmentInterviewController = catchAsync(
  async ({ params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const interviewId = params?.id;

    if (!interviewId) {
      throw new ApiError('Interview id is required', 400);
    }

    await ensureOrganizationRecord({
      entityLabel: 'Interview',
      id: interviewId,
      organizationId,
      supabaseAdmin,
      table: 'recruitment_interviews',
    });

    const { error } = await supabaseAdmin
      .from('recruitment_interviews')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', interviewId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Interview deleted successfully');
  },
);

export const createRecruitmentFeedbackController = catchAsync(
  async ({ body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const data = body as Record<string, any>;

    const interview = await ensureOrganizationRecord({
      entityLabel: 'Interview',
      id: data.interview_id,
      organizationId,
      select: 'id, candidate_id',
      supabaseAdmin,
      table: 'recruitment_interviews',
    });

    const interviewerEmployeeId =
      normalizeNullable(data.interviewer_employee_id) ??
      (await getCurrentEmployeeId({
        organizationId,
        supabaseAdmin,
        userId: user?.id,
      }));

    if (interviewerEmployeeId) {
      await ensureOrganizationRecord({
        entityLabel: 'Interviewer employee',
        id: interviewerEmployeeId,
        organizationId,
        supabaseAdmin,
        table: 'employees',
      });
    }

    const { data: created, error } = await supabaseAdmin
      .from('recruitment_interview_feedback')
      .insert({
        candidate_id: interview.candidate_id,
        concerns: normalizeNullable(data.concerns),
        created_by: user?.id ?? null,
        interviewer_employee_id: interviewerEmployeeId,
        interview_id: data.interview_id,
        organization_id: organizationId,
        rating:
          data.rating === null || data.rating === undefined
            ? null
            : Number(data.rating),
        recommendation: data.recommendation,
        strengths: normalizeNullable(data.strengths),
        summary: normalizeNullable(data.summary),
        updated_by: user?.id ?? null,
      })
      .select(feedbackSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    await touchCandidate({
      candidateId: interview.candidate_id,
      supabaseAdmin,
      userId: user?.id,
    });

    return successDataResponse('Interview feedback recorded successfully', created);
  },
);
