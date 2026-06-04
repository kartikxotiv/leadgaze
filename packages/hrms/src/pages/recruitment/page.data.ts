import {
  recruitmentCandidateStatuses,
  recruitmentEmploymentTypes,
  recruitmentFeedbackRecommendations,
  recruitmentInterviewRoundTypes,
  recruitmentInterviewStatuses,
  recruitmentOfferStatuses,
  recruitmentOnboardingStatuses,
  recruitmentPriorities,
  recruitmentRequisitionStatuses,
} from '../../types/recruitment.type';

function formatLabel(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export const recruitmentTabDefinitions = [
  { value: 'requisitions', label: 'Requisitions' },
  { value: 'candidates', label: 'Candidates' },
  { value: 'interviews', label: 'Interviews' },
  { value: 'offers', label: 'Offers' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'activity', label: 'Notes & Feedback' },
] as const;

export const recruitmentCandidateStatusOrder = [
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

export const employmentTypeOptions = recruitmentEmploymentTypes.map(
  (value) => ({
    label: formatLabel(value),
    value,
  }),
);

export const priorityOptions = recruitmentPriorities.map((value) => ({
  label: formatLabel(value),
  value,
}));

export const requisitionStatusOptions = recruitmentRequisitionStatuses.map(
  (value) => ({
    label: formatLabel(value),
    value,
  }),
);

export const candidateStatusOptions = recruitmentCandidateStatuses.map(
  (value) => ({
    label: formatLabel(value),
    value,
  }),
);

export const interviewRoundTypeOptions = recruitmentInterviewRoundTypes.map(
  (value) => ({
    label: formatLabel(value),
    value,
  }),
);

export const interviewStatusOptions = recruitmentInterviewStatuses.map(
  (value) => ({
    label: formatLabel(value),
    value,
  }),
);

export const feedbackRecommendationOptions =
  recruitmentFeedbackRecommendations.map((value) => ({
    label: formatLabel(value),
    value,
  }));

export const offerStatusOptions = recruitmentOfferStatuses.map((value) => ({
  label: formatLabel(value),
  value,
}));

export const onboardingStatusOptions = recruitmentOnboardingStatuses.map(
  (value) => ({
    label: formatLabel(value),
    value,
  }),
);

export { formatLabel };
