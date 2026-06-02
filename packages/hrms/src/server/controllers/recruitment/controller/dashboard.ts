/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import { ApiError, catchAsync, successDataResponse } from '~/utils/response-handler';
import type {
  RecruitmentCandidateStatus,
  RecruitmentDashboardResponse,
} from '~/types/recruitment.type';

import {
  candidateSelect,
  createEmptyCandidateStatusCounts,
  ensureSingle,
  feedbackSelect,
  getDepartmentReference,
  getEmployeeName,
  getRequiredOrganizationId,
  interviewSelect,
  isCurrentWeek,
  noteSelect,
  offerSelect,
  onboardingSelect,
  requisitionSelect,
} from './shared';

export const getRecruitmentDashboardController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<any>();
  const organizationId = await getRequiredOrganizationId(user?.id);

  const [
    requisitionsResult,
    candidatesResult,
    notesResult,
    interviewsResult,
    feedbackResult,
    offersResult,
    onboardingResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('recruitment_requisitions')
      .select(requisitionSelect)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('recruitment_candidates')
      .select(candidateSelect)
      .eq('organization_id', organizationId)
      .order('last_activity_at', { ascending: false }),
    supabaseAdmin
      .from('recruitment_candidate_notes')
      .select(noteSelect)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('recruitment_interviews')
      .select(interviewSelect)
      .eq('organization_id', organizationId)
      .order('scheduled_at', { ascending: true }),
    supabaseAdmin
      .from('recruitment_interview_feedback')
      .select(feedbackSelect)
      .eq('organization_id', organizationId)
      .order('submitted_at', { ascending: false }),
    supabaseAdmin
      .from('recruitment_offers')
      .select(offerSelect)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('recruitment_onboarding_tasks')
      .select(onboardingSelect)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
  ]);

  for (const result of [
    requisitionsResult,
    candidatesResult,
    notesResult,
    interviewsResult,
    feedbackResult,
    offersResult,
    onboardingResult,
  ]) {
    if (result.error) {
      throw new ApiError(result.error.message, 400);
    }
  }

  const requisitions = requisitionsResult.data ?? [];
  const candidates = candidatesResult.data ?? [];
  const notes = notesResult.data ?? [];
  const interviews = interviewsResult.data ?? [];
  const feedback = feedbackResult.data ?? [];
  const offers = offersResult.data ?? [];
  const onboardingTasks = onboardingResult.data ?? [];

  const candidateStatusCounts = createEmptyCandidateStatusCounts();
  const requisitionCandidateCount = new Map<string, number>();
  const requisitionInterviewCount = new Map<string, number>();
  const requisitionOfferCount = new Map<string, number>();
  const candidateNoteCount = new Map<string, number>();
  const candidateLatestNote = new Map<string, string | null>();
  const candidateFeedbackCount = new Map<string, number>();
  const candidateLatestFeedback = new Map<string, string | null>();
  const interviewFeedbackCount = new Map<string, number>();

  for (const candidate of candidates) {
    const status = candidate.status as RecruitmentCandidateStatus;
    candidateStatusCounts[status] += 1;
    requisitionCandidateCount.set(
      candidate.requisition_id,
      (requisitionCandidateCount.get(candidate.requisition_id) ?? 0) + 1,
    );
  }

  for (const note of notes) {
    candidateNoteCount.set(
      note.candidate_id,
      (candidateNoteCount.get(note.candidate_id) ?? 0) + 1,
    );

    if (!candidateLatestNote.has(note.candidate_id)) {
      candidateLatestNote.set(note.candidate_id, note.note);
    }
  }

  for (const interview of interviews) {
    requisitionInterviewCount.set(
      interview.requisition_id,
      (requisitionInterviewCount.get(interview.requisition_id) ?? 0) + 1,
    );
  }

  for (const item of feedback) {
    candidateFeedbackCount.set(
      item.candidate_id,
      (candidateFeedbackCount.get(item.candidate_id) ?? 0) + 1,
    );
    interviewFeedbackCount.set(
      item.interview_id,
      (interviewFeedbackCount.get(item.interview_id) ?? 0) + 1,
    );

    if (!candidateLatestFeedback.has(item.candidate_id)) {
      candidateLatestFeedback.set(item.candidate_id, item.summary ?? null);
    }
  }

  for (const offer of offers) {
    requisitionOfferCount.set(
      offer.requisition_id,
      (requisitionOfferCount.get(offer.requisition_id) ?? 0) + 1,
    );
  }

  const response: RecruitmentDashboardResponse = {
    candidateStatusCounts,
    candidates: candidates.map((candidate: any) => {
      const requisition = ensureSingle(candidate.requisition);

      return {
        applied_at: candidate.applied_at,
        created_at: candidate.created_at,
        current_company: candidate.current_company ?? null,
        current_ctc:
          candidate.current_ctc === null ? null : Number(candidate.current_ctc),
        current_designation: candidate.current_designation ?? null,
        email: candidate.email,
        experience_years:
          candidate.experience_years === null
            ? null
            : Number(candidate.experience_years),
        expected_ctc:
          candidate.expected_ctc === null ? null : Number(candidate.expected_ctc),
        feedback_count: candidateFeedbackCount.get(candidate.id) ?? 0,
        full_name: candidate.full_name,
        id: candidate.id,
        last_activity_at: candidate.last_activity_at,
        latest_feedback_summary: candidateLatestFeedback.get(candidate.id) ?? null,
        latest_note: candidateLatestNote.get(candidate.id) ?? null,
        notes_count: candidateNoteCount.get(candidate.id) ?? 0,
        notice_period_days: candidate.notice_period_days ?? null,
        owner_employee: getEmployeeName(candidate.owner_employee),
        owner_employee_id: candidate.owner_employee_id ?? null,
        phone: candidate.phone ?? null,
        requisition_code: requisition?.requisition_code ?? '',
        requisition_id: candidate.requisition_id,
        requisition_title: requisition?.title ?? 'Unknown requisition',
        resume_url: candidate.resume_url ?? null,
        source: candidate.source ?? null,
        status: candidate.status,
      };
    }),
    feedback: feedback.map((item: any) => {
      const candidate = ensureSingle(item.candidate);
      const interview = ensureSingle(item.interview);

      return {
        candidate_id: item.candidate_id,
        candidate_name: candidate?.full_name ?? 'Unknown candidate',
        concerns: item.concerns ?? null,
        id: item.id,
        interview_id: item.interview_id,
        interview_title: interview?.title ?? 'Interview',
        interviewer_employee: getEmployeeName(item.interviewer_employee),
        interviewer_employee_id: item.interviewer_employee_id ?? null,
        rating: item.rating ?? null,
        recommendation: item.recommendation,
        strengths: item.strengths ?? null,
        submitted_at: item.submitted_at,
        summary: item.summary ?? null,
      };
    }),
    interviews: interviews.map((item: any) => {
      const candidate = ensureSingle(item.candidate);
      const requisition = ensureSingle(item.requisition);

      return {
        candidate_id: item.candidate_id,
        candidate_name: candidate?.full_name ?? 'Unknown candidate',
        duration_minutes: item.duration_minutes,
        feedback_count: interviewFeedbackCount.get(item.id) ?? 0,
        id: item.id,
        interviewer_employee: getEmployeeName(item.interviewer_employee),
        interviewer_employee_id: item.interviewer_employee_id ?? null,
        location: item.location ?? null,
        meeting_link: item.meeting_link ?? null,
        outcome: item.outcome ?? null,
        requisition_id: item.requisition_id,
        requisition_title: requisition?.title ?? 'Unknown requisition',
        round_type: item.round_type,
        scheduled_at: item.scheduled_at,
        status: item.status,
        title: item.title,
      };
    }),
    metrics: {
      activeCandidates: candidates.filter((candidate: any) =>
        ['sourced', 'applied', 'screening', 'interview', 'shortlisted', 'offered'].includes(
          candidate.status,
        ),
      ).length,
      feedbackPending: interviews.filter(
        (item: any) =>
          item.status === 'completed' &&
          (interviewFeedbackCount.get(item.id) ?? 0) === 0,
      ).length,
      interviewsThisWeek: interviews.filter((item: any) =>
        isCurrentWeek(item.scheduled_at),
      ).length,
      offersInProgress: offers.filter((item: any) =>
        ['draft', 'approval_pending', 'sent'].includes(item.status),
      ).length,
      onboardingOpen: onboardingTasks.filter(
        (item: any) => item.status !== 'completed',
      ).length,
      openRequisitions: requisitions.filter((item: any) =>
        ['draft', 'open', 'on_hold'].includes(item.status),
      ).length,
    },
    notes: notes.map((item: any) => {
      const candidate = ensureSingle(item.candidate);

      return {
        author_employee: getEmployeeName(item.author_employee),
        author_employee_id: item.author_employee_id ?? null,
        candidate_id: item.candidate_id,
        candidate_name: candidate?.full_name ?? 'Unknown candidate',
        created_at: item.created_at,
        id: item.id,
        is_pinned: item.is_pinned,
        note: item.note,
      };
    }),
    offers: offers.map((item: any) => {
      const candidate = ensureSingle(item.candidate);
      const requisition = ensureSingle(item.requisition);

      return {
        approved_by_employee: getEmployeeName(item.approved_by_employee),
        approved_by_employee_id: item.approved_by_employee_id ?? null,
        candidate_id: item.candidate_id,
        candidate_name: candidate?.full_name ?? 'Unknown candidate',
        created_at: item.created_at,
        currency_code: item.currency_code,
        id: item.id,
        joining_date: item.joining_date ?? null,
        notes: item.notes ?? null,
        offered_designation: item.offered_designation,
        requisition_id: item.requisition_id,
        requisition_title: requisition?.title ?? 'Unknown requisition',
        responded_at: item.responded_at ?? null,
        salary_amount: Number(item.salary_amount),
        sent_at: item.sent_at ?? null,
        status: item.status,
      };
    }),
    onboardingTasks: onboardingTasks.map((item: any) => {
      const candidate = ensureSingle(item.candidate);
      const offer = ensureSingle(item.offer);

      return {
        candidate_id: item.candidate_id,
        candidate_name: candidate?.full_name ?? 'Unknown candidate',
        completed_at: item.completed_at ?? null,
        created_at: item.created_at,
        description: item.description ?? null,
        due_date: item.due_date ?? null,
        id: item.id,
        offer_designation: offer?.offered_designation ?? null,
        offer_id: item.offer_id ?? null,
        owner_employee: getEmployeeName(item.owner_employee),
        owner_employee_id: item.owner_employee_id ?? null,
        status: item.status,
        title: item.title,
      };
    }),
    requisitions: requisitions.map((item: any) => ({
      candidate_count: requisitionCandidateCount.get(item.id) ?? 0,
      closed_at: item.closed_at ?? null,
      compensation_max:
        item.compensation_max === null ? null : Number(item.compensation_max),
      compensation_min:
        item.compensation_min === null ? null : Number(item.compensation_min),
      created_at: item.created_at,
      department: getDepartmentReference(item.department),
      department_id: item.department_id ?? null,
      description: item.description ?? null,
      employment_type: item.employment_type,
      hiring_manager_employee: getEmployeeName(item.hiring_manager_employee),
      hiring_manager_employee_id: item.hiring_manager_employee_id ?? null,
      id: item.id,
      interviews_count: requisitionInterviewCount.get(item.id) ?? 0,
      location: item.location ?? null,
      offers_count: requisitionOfferCount.get(item.id) ?? 0,
      openings: item.openings,
      owner_employee: getEmployeeName(item.owner_employee),
      owner_employee_id: item.owner_employee_id ?? null,
      priority: item.priority,
      requested_by_employee: getEmployeeName(item.requested_by_employee),
      requested_by_employee_id: item.requested_by_employee_id ?? null,
      requisition_code: item.requisition_code,
      status: item.status,
      target_start_date: item.target_start_date ?? null,
      title: item.title,
      updated_at: item.updated_at,
    })),
  };

  return successDataResponse('Recruitment dashboard fetched successfully', response);
});

export const getRecruitmentOptionsController = catchAsync(async ({ user }) => {
  const supabaseAdmin = getSupabaseServerAdminClient<any>();
  const organizationId = await getRequiredOrganizationId(user?.id);

  const [
    departmentsResult,
    employeesResult,
    requisitionsResult,
    candidatesResult,
    interviewsResult,
    offersResult,
  ] = await Promise.all([
    supabaseAdmin
      .from('departments')
      .select('id, name, code')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true }),
    supabaseAdmin
      .from('employees')
      .select('id, first_name, last_name, employee_code')
      .eq('organization_id', organizationId)
      .order('first_name', { ascending: true }),
    supabaseAdmin
      .from('recruitment_requisitions')
      .select('id, requisition_code, title, status')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('recruitment_candidates')
      .select('id, requisition_id, full_name, email, status')
      .eq('organization_id', organizationId)
      .order('full_name', { ascending: true }),
    supabaseAdmin
      .from('recruitment_interviews')
      .select('id, candidate_id, title, status')
      .eq('organization_id', organizationId)
      .order('scheduled_at', { ascending: false }),
    supabaseAdmin
      .from('recruitment_offers')
      .select('id, candidate_id, offered_designation, status')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
  ]);

  for (const result of [
    departmentsResult,
    employeesResult,
    requisitionsResult,
    candidatesResult,
    interviewsResult,
    offersResult,
  ]) {
    if (result.error) {
      throw new ApiError(result.error.message, 400);
    }
  }

  return successDataResponse('Recruitment options fetched successfully', {
    candidates: (candidatesResult.data ?? []).map((item: any) => ({
      email: item.email,
      full_name: item.full_name,
      id: item.id,
      requisition_id: item.requisition_id,
      status: item.status,
    })),
    departments: (departmentsResult.data ?? []).map((item: any) => ({
      code: item.code,
      id: item.id,
      name: item.name,
    })),
    employees: (employeesResult.data ?? []).map((item: any) => ({
      employee_code: item.employee_code ?? null,
      id: item.id,
      name:
        [item.first_name, item.last_name].filter(Boolean).join(' ') ||
        item.employee_code ||
        'Unknown employee',
    })),
    interviews: (interviewsResult.data ?? []).map((item: any) => ({
      candidate_id: item.candidate_id,
      id: item.id,
      status: item.status,
      title: item.title,
    })),
    offers: (offersResult.data ?? []).map((item: any) => ({
      candidate_id: item.candidate_id,
      id: item.id,
      offered_designation: item.offered_designation,
      status: item.status,
    })),
    requisitions: (requisitionsResult.data ?? []).map((item: any) => ({
      id: item.id,
      requisition_code: item.requisition_code,
      status: item.status,
      title: item.title,
    })),
  });
});
