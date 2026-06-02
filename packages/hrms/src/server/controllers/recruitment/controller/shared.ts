/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCurrentUserOrganizationId } from '~/lib/server/organizations';
import { ApiError } from '~/utils/response-handler';
import type {
  RecruitmentCandidateStatus,
  RecruitmentDashboardResponse,
  RecruitmentOfferStatus,
  RecruitmentOnboardingStatus,
} from '~/types/recruitment.type';

export const requisitionSelect = `
  id,
  organization_id,
  department_id,
  requested_by_employee_id,
  owner_employee_id,
  hiring_manager_employee_id,
  requisition_code,
  title,
  employment_type,
  location,
  priority,
  openings,
  status,
  target_start_date,
  description,
  compensation_min,
  compensation_max,
  closed_at,
  created_at,
  updated_at,
  department:departments!recruitment_requisitions_department_id_fkey(id, name, code),
  requested_by_employee:employees!recruitment_requisitions_requested_by_employee_id_fkey(id, first_name, last_name, employee_code),
  owner_employee:employees!recruitment_requisitions_owner_employee_id_fkey(id, first_name, last_name, employee_code),
  hiring_manager_employee:employees!recruitment_requisitions_hiring_manager_employee_id_fkey(id, first_name, last_name, employee_code)
`;

export const candidateSelect = `
  id,
  organization_id,
  requisition_id,
  owner_employee_id,
  full_name,
  email,
  phone,
  source,
  current_company,
  current_designation,
  experience_years,
  notice_period_days,
  current_ctc,
  expected_ctc,
  resume_url,
  status,
  applied_at,
  last_activity_at,
  created_at,
  updated_at,
  requisition:recruitment_requisitions(id, title, requisition_code, status),
  owner_employee:employees!recruitment_candidates_owner_employee_id_fkey(id, first_name, last_name, employee_code)
`;

export const noteSelect = `
  id,
  organization_id,
  candidate_id,
  author_employee_id,
  note,
  is_pinned,
  created_at,
  updated_at,
  candidate:recruitment_candidates(id, full_name),
  author_employee:employees!recruitment_candidate_notes_author_employee_id_fkey(id, first_name, last_name, employee_code)
`;

export const interviewSelect = `
  id,
  organization_id,
  candidate_id,
  requisition_id,
  interviewer_employee_id,
  title,
  round_type,
  scheduled_at,
  duration_minutes,
  meeting_link,
  location,
  status,
  outcome,
  created_at,
  updated_at,
  candidate:recruitment_candidates(id, full_name, status),
  requisition:recruitment_requisitions(id, title, requisition_code, status),
  interviewer_employee:employees!recruitment_interviews_interviewer_employee_id_fkey(id, first_name, last_name, employee_code)
`;

export const feedbackSelect = `
  id,
  organization_id,
  interview_id,
  candidate_id,
  interviewer_employee_id,
  recommendation,
  rating,
  strengths,
  concerns,
  summary,
  submitted_at,
  created_at,
  updated_at,
  interview:recruitment_interviews(id, title, status),
  candidate:recruitment_candidates(id, full_name, status),
  interviewer_employee:employees!recruitment_interview_feedback_interviewer_employee_id_fkey(id, first_name, last_name, employee_code)
`;

export const offerSelect = `
  id,
  organization_id,
  candidate_id,
  requisition_id,
  approved_by_employee_id,
  offered_designation,
  salary_amount,
  currency_code,
  joining_date,
  status,
  sent_at,
  responded_at,
  notes,
  created_at,
  updated_at,
  candidate:recruitment_candidates(id, full_name, status),
  requisition:recruitment_requisitions(id, title, requisition_code, status),
  approved_by_employee:employees!recruitment_offers_approved_by_employee_id_fkey(id, first_name, last_name, employee_code)
`;

export const onboardingSelect = `
  id,
  organization_id,
  candidate_id,
  offer_id,
  owner_employee_id,
  title,
  description,
  due_date,
  status,
  completed_at,
  created_at,
  updated_at,
  candidate:recruitment_candidates(id, full_name, status),
  offer:recruitment_offers(id, offered_designation, status),
  owner_employee:employees!recruitment_onboarding_tasks_owner_employee_id_fkey(id, first_name, last_name, employee_code)
`;

export function ensureSingle<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function normalizeNullable(value: unknown): any {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  return value;
}

export function getEmployeeName(employee: any) {
  const normalizedEmployee = ensureSingle(employee);

  if (!normalizedEmployee) {
    return null;
  }

  const name = [normalizedEmployee.first_name, normalizedEmployee.last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    employee_code: normalizedEmployee.employee_code ?? null,
    id: normalizedEmployee.id,
    name: name || normalizedEmployee.employee_code || 'Unknown employee',
  };
}

export function getDepartmentReference(department: any) {
  const normalizedDepartment = ensureSingle(department);

  if (!normalizedDepartment) {
    return null;
  }

  return {
    code: normalizedDepartment.code,
    id: normalizedDepartment.id,
    name: normalizedDepartment.name,
  };
}

export async function getRequiredOrganizationId(userId?: string) {
  const organizationId = await getCurrentUserOrganizationId(userId);

  if (!organizationId) {
    throw new ApiError('Organization not found', 404);
  }

  return organizationId;
}

export async function getCurrentEmployeeId(params: {
  organizationId: string;
  supabaseAdmin: any;
  userId?: string;
}) {
  if (!params.userId) {
    return null;
  }

  const { data, error } = await params.supabaseAdmin
    .from('employees')
    .select('id')
    .eq('organization_id', params.organizationId)
    .eq('account_id', params.userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  return data?.id ?? null;
}

export async function ensureOrganizationRecord(params: {
  entityLabel: string;
  id?: string | null;
  organizationId: string;
  select?: string;
  supabaseAdmin: any;
  table: string;
}) {
  if (!params.id) {
    return null;
  }

  const { data, error } = await params.supabaseAdmin
    .from(params.table)
    .select(params.select ?? 'id')
    .eq('organization_id', params.organizationId)
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    throw new ApiError(error.message, 400);
  }

  if (!data) {
    throw new ApiError(`${params.entityLabel} not found`, 404);
  }

  return data;
}

export async function touchCandidate(params: {
  candidateId: string;
  supabaseAdmin: any;
  userId?: string;
}) {
  const { error } = await params.supabaseAdmin
    .from('recruitment_candidates')
    .update({
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: params.userId ?? null,
    })
    .eq('id', params.candidateId);

  if (error) {
    throw new ApiError(error.message, 400);
  }
}

export async function updateCandidateStatus(params: {
  candidateId: string;
  status: RecruitmentCandidateStatus;
  supabaseAdmin: any;
  userId?: string;
}) {
  const { error } = await params.supabaseAdmin
    .from('recruitment_candidates')
    .update({
      last_activity_at: new Date().toISOString(),
      status: params.status,
      updated_at: new Date().toISOString(),
      updated_by: params.userId ?? null,
    })
    .eq('id', params.candidateId);

  if (error) {
    throw new ApiError(error.message, 400);
  }
}

export function getOfferCandidateStatus(status: RecruitmentOfferStatus) {
  if (status === 'accepted') {
    return 'hired' as const;
  }

  if (status === 'declined') {
    return 'withdrawn' as const;
  }

  if (status === 'sent') {
    return 'offered' as const;
  }

  return null;
}

export function getClosedAt(status: string) {
  return status === 'closed' || status === 'cancelled'
    ? new Date().toISOString()
    : null;
}

export function isCurrentWeek(value: string) {
  const date = new Date(value);
  const today = new Date();
  const start = new Date(today);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + diff);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);

  return date >= start && date < end;
}

export function createEmptyCandidateStatusCounts(): RecruitmentDashboardResponse['candidateStatusCounts'] {
  return {
    applied: 0,
    hired: 0,
    interview: 0,
    offered: 0,
    rejected: 0,
    screening: 0,
    shortlisted: 0,
    sourced: 0,
    withdrawn: 0,
  };
}

export function getCompletedAt(status: RecruitmentOnboardingStatus) {
  return status === 'completed' ? new Date().toISOString() : null;
}
