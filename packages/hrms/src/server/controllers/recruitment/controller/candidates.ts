/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';

import {
  candidateSelect,
  ensureOrganizationRecord,
  getCurrentEmployeeId,
  getRequiredOrganizationId,
  normalizeNullable,
  noteSelect,
  touchCandidate,
} from './shared';

export const createRecruitmentCandidateController = catchAsync(
  async ({ body, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const data = body as Record<string, any>;

    await ensureOrganizationRecord({
      entityLabel: 'Requisition',
      id: data.requisition_id,
      organizationId,
      supabaseAdmin,
      table: 'recruitment_requisitions',
    });
    await ensureOrganizationRecord({
      entityLabel: 'Owner employee',
      id: normalizeNullable(data.owner_employee_id),
      organizationId,
      supabaseAdmin,
      table: 'employees',
    });

    const payload = {
      applied_at:
        normalizeNullable(data.applied_at) ?? new Date().toISOString().slice(0, 10),
      created_by: user?.id ?? null,
      current_company: normalizeNullable(data.current_company),
      current_ctc:
        data.current_ctc === null || data.current_ctc === undefined
          ? null
          : Number(data.current_ctc),
      current_designation: normalizeNullable(data.current_designation),
      email: String(data.email).trim().toLowerCase(),
      expected_ctc:
        data.expected_ctc === null || data.expected_ctc === undefined
          ? null
          : Number(data.expected_ctc),
      experience_years:
        data.experience_years === null || data.experience_years === undefined
          ? null
          : Number(data.experience_years),
      full_name: String(data.full_name).trim(),
      last_activity_at: new Date().toISOString(),
      notice_period_days:
        data.notice_period_days === null || data.notice_period_days === undefined
          ? null
          : Number(data.notice_period_days),
      organization_id: organizationId,
      owner_employee_id: normalizeNullable(data.owner_employee_id),
      phone: normalizeNullable(data.phone),
      requisition_id: data.requisition_id,
      resume_url: normalizeNullable(data.resume_url),
      source: normalizeNullable(data.source),
      status: data.status,
      updated_by: user?.id ?? null,
    };

    const { data: created, error } = await supabaseAdmin
      .from('recruitment_candidates')
      .insert(payload)
      .select(candidateSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Candidate created successfully', created);
  },
);

export const updateRecruitmentCandidateController = catchAsync(
  async ({ body, params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const candidateId = params?.id;
    const data = body as Record<string, any>;

    if (!candidateId) {
      throw new ApiError('Candidate id is required', 400);
    }

    await ensureOrganizationRecord({
      entityLabel: 'Candidate',
      id: candidateId,
      organizationId,
      supabaseAdmin,
      table: 'recruitment_candidates',
    });

    if (data.requisition_id !== undefined) {
      await ensureOrganizationRecord({
        entityLabel: 'Requisition',
        id: data.requisition_id,
        organizationId,
        supabaseAdmin,
        table: 'recruitment_requisitions',
      });
    }

    if (data.owner_employee_id !== undefined) {
      await ensureOrganizationRecord({
        entityLabel: 'Owner employee',
        id: normalizeNullable(data.owner_employee_id),
        organizationId,
        supabaseAdmin,
        table: 'employees',
      });
    }

    const payload: Record<string, any> = {
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };

    if (data.requisition_id !== undefined) {
      payload.requisition_id = data.requisition_id;
    }
    if (data.owner_employee_id !== undefined) {
      payload.owner_employee_id = normalizeNullable(data.owner_employee_id);
    }
    if (data.full_name !== undefined) {
      payload.full_name = String(data.full_name).trim();
    }
    if (data.email !== undefined) {
      payload.email = String(data.email).trim().toLowerCase();
    }
    if (data.phone !== undefined) {
      payload.phone = normalizeNullable(data.phone);
    }
    if (data.source !== undefined) {
      payload.source = normalizeNullable(data.source);
    }
    if (data.current_company !== undefined) {
      payload.current_company = normalizeNullable(data.current_company);
    }
    if (data.current_designation !== undefined) {
      payload.current_designation = normalizeNullable(data.current_designation);
    }
    if (data.experience_years !== undefined) {
      payload.experience_years =
        data.experience_years === null ? null : Number(data.experience_years);
    }
    if (data.notice_period_days !== undefined) {
      payload.notice_period_days =
        data.notice_period_days === null ? null : Number(data.notice_period_days);
    }
    if (data.current_ctc !== undefined) {
      payload.current_ctc = data.current_ctc === null ? null : Number(data.current_ctc);
    }
    if (data.expected_ctc !== undefined) {
      payload.expected_ctc =
        data.expected_ctc === null ? null : Number(data.expected_ctc);
    }
    if (data.resume_url !== undefined) {
      payload.resume_url = normalizeNullable(data.resume_url);
    }
    if (data.status !== undefined) {
      payload.status = data.status;
    }
    if (data.applied_at !== undefined) {
      payload.applied_at = normalizeNullable(data.applied_at);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('recruitment_candidates')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', candidateId)
      .select(candidateSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Candidate updated successfully', updated);
  },
);

export const deleteRecruitmentCandidateController = catchAsync(
  async ({ params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const candidateId = params?.id;

    if (!candidateId) {
      throw new ApiError('Candidate id is required', 400);
    }

    await ensureOrganizationRecord({
      entityLabel: 'Candidate',
      id: candidateId,
      organizationId,
      supabaseAdmin,
      table: 'recruitment_candidates',
    });

    const { error } = await supabaseAdmin
      .from('recruitment_candidates')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', candidateId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Candidate deleted successfully');
  },
);

export const createRecruitmentCandidateNoteController = catchAsync(
  async ({ body, params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const candidateId = params?.id;
    const data = body as Record<string, any>;

    if (!candidateId) {
      throw new ApiError('Candidate id is required', 400);
    }

    await ensureOrganizationRecord({
      entityLabel: 'Candidate',
      id: candidateId,
      organizationId,
      select: 'id',
      supabaseAdmin,
      table: 'recruitment_candidates',
    });

    const authorEmployeeId = await getCurrentEmployeeId({
      organizationId,
      supabaseAdmin,
      userId: user?.id,
    });

    const { data: created, error } = await supabaseAdmin
      .from('recruitment_candidate_notes')
      .insert({
        author_employee_id: authorEmployeeId,
        candidate_id: candidateId,
        created_by: user?.id ?? null,
        is_pinned: Boolean(data.is_pinned),
        note: String(data.note).trim(),
        organization_id: organizationId,
        updated_by: user?.id ?? null,
      })
      .select(noteSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    await touchCandidate({
      candidateId,
      supabaseAdmin,
      userId: user?.id,
    });

    return successDataResponse('Candidate note added successfully', created);
  },
);
