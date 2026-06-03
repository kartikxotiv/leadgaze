export const recruitmentRequisitionStatuses = [
  'draft',
  'open',
  'on_hold',
  'filled',
  'closed',
  'cancelled',
] as const;

export const recruitmentPriorities = [
  'low',
  'medium',
  'high',
  'urgent',
] as const;

export const recruitmentEmploymentTypes = [
  'full_time',
  'part_time',
  'contract',
  'intern',
] as const;

export const recruitmentCandidateStatuses = [
  'sourced',
  'applied',
  'screening',
  'interview',
  'shortlisted',
  'offered',
  'hired',
  'rejected',
  'withdrawn',
] as const;

export const recruitmentInterviewStatuses = [
  'scheduled',
  'completed',
  'cancelled',
  'no_show',
] as const;

export const recruitmentInterviewRoundTypes = [
  'screening',
  'technical',
  'managerial',
  'panel',
  'hr',
] as const;

export const recruitmentFeedbackRecommendations = [
  'strong_yes',
  'yes',
  'maybe',
  'no',
] as const;

export const recruitmentOfferStatuses = [
  'draft',
  'approval_pending',
  'sent',
  'accepted',
  'declined',
  'expired',
] as const;

export const recruitmentOnboardingStatuses = [
  'pending',
  'in_progress',
  'completed',
  'blocked',
] as const;

export type RecruitmentRequisitionStatus =
  (typeof recruitmentRequisitionStatuses)[number];
export type RecruitmentPriority = (typeof recruitmentPriorities)[number];
export type RecruitmentEmploymentType =
  (typeof recruitmentEmploymentTypes)[number];
export type RecruitmentCandidateStatus =
  (typeof recruitmentCandidateStatuses)[number];
export type RecruitmentInterviewStatus =
  (typeof recruitmentInterviewStatuses)[number];
export type RecruitmentInterviewRoundType =
  (typeof recruitmentInterviewRoundTypes)[number];
export type RecruitmentFeedbackRecommendation =
  (typeof recruitmentFeedbackRecommendations)[number];
export type RecruitmentOfferStatus = (typeof recruitmentOfferStatuses)[number];
export type RecruitmentOnboardingStatus =
  (typeof recruitmentOnboardingStatuses)[number];

export type ApiSuccessResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string | null;
  error?: string | null;
  data: T;
};

export type RecruitmentOptionDepartment = {
  id: string;
  name: string;
  code: string;
};

export type RecruitmentOptionEmployee = {
  id: string;
  name: string;
  employee_code: string | null;
};

export type RecruitmentOptionRequisition = {
  id: string;
  requisition_code: string;
  title: string;
  status: RecruitmentRequisitionStatus;
};

export type RecruitmentOptionCandidate = {
  id: string;
  requisition_id: string;
  full_name: string;
  email: string;
  status: RecruitmentCandidateStatus;
};

export type RecruitmentOptionInterview = {
  id: string;
  candidate_id: string;
  title: string;
  status: RecruitmentInterviewStatus;
};

export type RecruitmentOptionOffer = {
  id: string;
  candidate_id: string;
  offered_designation: string;
  status: RecruitmentOfferStatus;
};

export type RecruitmentOptionsResponse = {
  candidates: RecruitmentOptionCandidate[];
  departments: RecruitmentOptionDepartment[];
  employees: RecruitmentOptionEmployee[];
  interviews: RecruitmentOptionInterview[];
  offers: RecruitmentOptionOffer[];
  requisitions: RecruitmentOptionRequisition[];
};

export type RecruitmentPersonReference = {
  id: string;
  name: string;
  employee_code: string | null;
};

export type RecruitmentDepartmentReference = {
  id: string;
  name: string;
  code: string;
};

export type RecruitmentRequisitionSummary = {
  id: string;
  requisition_code: string;
  title: string;
  department_id: string | null;
  department: RecruitmentDepartmentReference | null;
  requested_by_employee_id: string | null;
  requested_by_employee: RecruitmentPersonReference | null;
  owner_employee_id: string | null;
  owner_employee: RecruitmentPersonReference | null;
  hiring_manager_employee_id: string | null;
  hiring_manager_employee: RecruitmentPersonReference | null;
  employment_type: RecruitmentEmploymentType;
  location: string | null;
  priority: RecruitmentPriority;
  openings: number;
  status: RecruitmentRequisitionStatus;
  target_start_date: string | null;
  description: string | null;
  compensation_min: number | null;
  compensation_max: number | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  candidate_count: number;
  interviews_count: number;
  offers_count: number;
};

export type RecruitmentCandidateSummary = {
  id: string;
  requisition_id: string;
  requisition_title: string;
  requisition_code: string;
  owner_employee_id: string | null;
  owner_employee: RecruitmentPersonReference | null;
  full_name: string;
  email: string;
  phone: string | null;
  source: string | null;
  current_company: string | null;
  current_designation: string | null;
  experience_years: number | null;
  notice_period_days: number | null;
  current_ctc: number | null;
  expected_ctc: number | null;
  resume_url: string | null;
  status: RecruitmentCandidateStatus;
  applied_at: string;
  last_activity_at: string;
  created_at: string;
  notes_count: number;
  feedback_count: number;
  latest_note: string | null;
  latest_feedback_summary: string | null;
};

export type RecruitmentInterviewSummary = {
  id: string;
  candidate_id: string;
  candidate_name: string;
  requisition_id: string;
  requisition_title: string;
  title: string;
  round_type: RecruitmentInterviewRoundType;
  interviewer_employee_id: string | null;
  interviewer_employee: RecruitmentPersonReference | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_link: string | null;
  location: string | null;
  status: RecruitmentInterviewStatus;
  outcome: string | null;
  feedback_count: number;
};

export type RecruitmentFeedbackSummary = {
  id: string;
  interview_id: string;
  interview_title: string;
  candidate_id: string;
  candidate_name: string;
  interviewer_employee_id: string | null;
  interviewer_employee: RecruitmentPersonReference | null;
  recommendation: RecruitmentFeedbackRecommendation;
  rating: number | null;
  strengths: string | null;
  concerns: string | null;
  summary: string | null;
  submitted_at: string;
};

export type RecruitmentCandidateNoteSummary = {
  id: string;
  candidate_id: string;
  candidate_name: string;
  author_employee_id: string | null;
  author_employee: RecruitmentPersonReference | null;
  note: string;
  is_pinned: boolean;
  created_at: string;
};

export type RecruitmentOfferSummary = {
  id: string;
  candidate_id: string;
  candidate_name: string;
  requisition_id: string;
  requisition_title: string;
  approved_by_employee_id: string | null;
  approved_by_employee: RecruitmentPersonReference | null;
  offered_designation: string;
  salary_amount: number;
  currency_code: string;
  joining_date: string | null;
  status: RecruitmentOfferStatus;
  sent_at: string | null;
  responded_at: string | null;
  notes: string | null;
  created_at: string;
};

export type RecruitmentOnboardingTaskSummary = {
  id: string;
  candidate_id: string;
  candidate_name: string;
  offer_id: string | null;
  offer_designation: string | null;
  owner_employee_id: string | null;
  owner_employee: RecruitmentPersonReference | null;
  title: string;
  description: string | null;
  due_date: string | null;
  status: RecruitmentOnboardingStatus;
  completed_at: string | null;
  created_at: string;
};

export type RecruitmentDashboardMetrics = {
  activeCandidates: number;
  feedbackPending: number;
  interviewsThisWeek: number;
  offersInProgress: number;
  onboardingOpen: number;
  openRequisitions: number;
};

export type RecruitmentDashboardResponse = {
  candidateStatusCounts: Record<RecruitmentCandidateStatus, number>;
  candidates: RecruitmentCandidateSummary[];
  feedback: RecruitmentFeedbackSummary[];
  interviews: RecruitmentInterviewSummary[];
  metrics: RecruitmentDashboardMetrics;
  notes: RecruitmentCandidateNoteSummary[];
  offers: RecruitmentOfferSummary[];
  onboardingTasks: RecruitmentOnboardingTaskSummary[];
  requisitions: RecruitmentRequisitionSummary[];
};

export type RecruitmentRequisitionPayload = {
  compensation_max?: number | null;
  compensation_min?: number | null;
  department_id?: string | null;
  description?: string | null;
  employment_type: RecruitmentEmploymentType;
  hiring_manager_employee_id?: string | null;
  location?: string | null;
  openings: number;
  owner_employee_id?: string | null;
  priority: RecruitmentPriority;
  requested_by_employee_id?: string | null;
  requisition_code: string;
  status: RecruitmentRequisitionStatus;
  target_start_date?: string | null;
  title: string;
};

export type RecruitmentCandidatePayload = {
  applied_at?: string | null;
  current_company?: string | null;
  current_ctc?: number | null;
  current_designation?: string | null;
  email: string;
  expected_ctc?: number | null;
  experience_years?: number | null;
  full_name: string;
  notice_period_days?: number | null;
  owner_employee_id?: string | null;
  phone?: string | null;
  requisition_id: string;
  resume_url?: string | null;
  source?: string | null;
  status: RecruitmentCandidateStatus;
};

export type RecruitmentInterviewPayload = {
  candidate_id: string;
  duration_minutes: number;
  interviewer_employee_id?: string | null;
  location?: string | null;
  meeting_link?: string | null;
  outcome?: string | null;
  round_type: RecruitmentInterviewRoundType;
  scheduled_at: string;
  status: RecruitmentInterviewStatus;
  title: string;
};

export type RecruitmentFeedbackPayload = {
  concerns?: string | null;
  interviewer_employee_id?: string | null;
  interview_id: string;
  rating?: number | null;
  recommendation: RecruitmentFeedbackRecommendation;
  strengths?: string | null;
  summary?: string | null;
};

export type RecruitmentCandidateNotePayload = {
  is_pinned?: boolean;
  note: string;
};

export type RecruitmentOfferPayload = {
  approved_by_employee_id?: string | null;
  candidate_id: string;
  currency_code?: string;
  joining_date?: string | null;
  notes?: string | null;
  offered_designation: string;
  salary_amount: number;
  status: RecruitmentOfferStatus;
};

export type RecruitmentOnboardingTaskPayload = {
  candidate_id: string;
  description?: string | null;
  due_date?: string | null;
  offer_id?: string | null;
  owner_employee_id?: string | null;
  status: RecruitmentOnboardingStatus;
  title: string;
};
