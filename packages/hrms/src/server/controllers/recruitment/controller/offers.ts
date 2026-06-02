/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';
import type { RecruitmentOfferStatus } from '~/types/recruitment.type';

import {
  ensureOrganizationRecord,
  getOfferCandidateStatus,
  getRequiredOrganizationId,
  normalizeNullable,
  offerSelect,
  touchCandidate,
  updateCandidateStatus,
} from './shared';

export const createRecruitmentOfferController = catchAsync(
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
      entityLabel: 'Approver employee',
      id: normalizeNullable(data.approved_by_employee_id),
      organizationId,
      supabaseAdmin,
      table: 'employees',
    });

    const status = data.status as RecruitmentOfferStatus;
    const now = new Date().toISOString();

    const { data: created, error } = await supabaseAdmin
      .from('recruitment_offers')
      .insert({
        approved_by_employee_id: normalizeNullable(data.approved_by_employee_id),
        candidate_id: data.candidate_id,
        created_by: user?.id ?? null,
        currency_code: String(data.currency_code ?? 'INR').trim().toUpperCase(),
        joining_date: normalizeNullable(data.joining_date),
        notes: normalizeNullable(data.notes),
        offered_designation: String(data.offered_designation).trim(),
        organization_id: organizationId,
        requisition_id: candidate.requisition_id,
        salary_amount: Number(data.salary_amount),
        sent_at: status === 'sent' ? now : null,
        responded_at: status === 'accepted' || status === 'declined' ? now : null,
        status,
        updated_by: user?.id ?? null,
      })
      .select(offerSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    const candidateStatus = getOfferCandidateStatus(status);

    if (candidateStatus) {
      await updateCandidateStatus({
        candidateId: data.candidate_id,
        status: candidateStatus,
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

    return successDataResponse('Offer saved successfully', created);
  },
);

export const updateRecruitmentOfferController = catchAsync(
  async ({ body, params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const offerId = params?.id;
    const data = body as Record<string, any>;

    if (!offerId) {
      throw new ApiError('Offer id is required', 400);
    }

    const existingOffer = await ensureOrganizationRecord({
      entityLabel: 'Offer',
      id: offerId,
      organizationId,
      select: 'id, candidate_id, requisition_id, sent_at, responded_at',
      supabaseAdmin,
      table: 'recruitment_offers',
    });

    let candidateId = existingOffer.candidate_id;
    let requisitionId = existingOffer.requisition_id;

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

    if (data.approved_by_employee_id !== undefined) {
      await ensureOrganizationRecord({
        entityLabel: 'Approver employee',
        id: normalizeNullable(data.approved_by_employee_id),
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
    if (data.approved_by_employee_id !== undefined) {
      payload.approved_by_employee_id = normalizeNullable(data.approved_by_employee_id);
    }
    if (data.offered_designation !== undefined) {
      payload.offered_designation = String(data.offered_designation).trim();
    }
    if (data.salary_amount !== undefined) {
      payload.salary_amount = Number(data.salary_amount);
    }
    if (data.currency_code !== undefined) {
      payload.currency_code = String(data.currency_code).trim().toUpperCase();
    }
    if (data.joining_date !== undefined) {
      payload.joining_date = normalizeNullable(data.joining_date);
    }
    if (data.notes !== undefined) {
      payload.notes = normalizeNullable(data.notes);
    }
    if (data.status !== undefined) {
      const status = data.status as RecruitmentOfferStatus;
      payload.status = status;

      if (status === 'sent' && !existingOffer.sent_at) {
        payload.sent_at = new Date().toISOString();
      }

      if ((status === 'accepted' || status === 'declined') && !existingOffer.responded_at) {
        payload.responded_at = new Date().toISOString();
      }
    }

    const { data: updated, error } = await supabaseAdmin
      .from('recruitment_offers')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', offerId)
      .select(offerSelect)
      .single();

    if (error) {
      throw new ApiError(error.message, 400);
    }

    const nextStatus = (payload.status ?? updated.status) as RecruitmentOfferStatus;
    const candidateStatus = getOfferCandidateStatus(nextStatus);

    if (candidateStatus) {
      await updateCandidateStatus({
        candidateId,
        status: candidateStatus,
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

    return successDataResponse('Offer updated successfully', updated);
  },
);

export const deleteRecruitmentOfferController = catchAsync(
  async ({ params, user }) => {
    const supabaseAdmin = getSupabaseServerAdminClient<any>();
    const organizationId = await getRequiredOrganizationId(user?.id);
    const offerId = params?.id;

    if (!offerId) {
      throw new ApiError('Offer id is required', 400);
    }

    await ensureOrganizationRecord({
      entityLabel: 'Offer',
      id: offerId,
      organizationId,
      supabaseAdmin,
      table: 'recruitment_offers',
    });

    const { error } = await supabaseAdmin
      .from('recruitment_offers')
      .delete()
      .eq('organization_id', organizationId)
      .eq('id', offerId);

    if (error) {
      throw new ApiError(error.message, 400);
    }

    return successDataResponse('Offer deleted successfully');
  },
);
