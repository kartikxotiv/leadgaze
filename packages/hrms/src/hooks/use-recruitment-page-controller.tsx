'use client';

import { useMemo, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BriefcaseBusiness,
  CalendarClock,
  FileCheck2,
  UsersRound,
} from 'lucide-react';

import { useRbac } from '~/components/rbac/rbac-context';
import {
  createRecruitmentCandidateNoteService,
  createRecruitmentCandidateService,
  createRecruitmentFeedbackService,
  createRecruitmentInterviewService,
  createRecruitmentOfferService,
  createRecruitmentOnboardingTaskService,
  createRecruitmentRequisitionService,
  deleteRecruitmentCandidateService,
  deleteRecruitmentInterviewService,
  deleteRecruitmentOfferService,
  deleteRecruitmentOnboardingTaskService,
  deleteRecruitmentRequisitionService,
  getRecruitmentDashboardService,
  getRecruitmentOptionsService,
  updateRecruitmentCandidateService,
  updateRecruitmentInterviewService,
  updateRecruitmentOfferService,
  updateRecruitmentOnboardingTaskService,
  updateRecruitmentRequisitionService,
} from '~/services/recruitment.service';
import type {
  RecruitmentCandidateNotePayload,
  RecruitmentCandidatePayload,
  RecruitmentCandidateSummary,
  RecruitmentDashboardResponse,
  RecruitmentFeedbackPayload,
  RecruitmentInterviewPayload,
  RecruitmentInterviewSummary,
  RecruitmentOfferPayload,
  RecruitmentOfferSummary,
  RecruitmentOnboardingTaskPayload,
  RecruitmentOnboardingTaskSummary,
  RecruitmentOptionsResponse,
  RecruitmentRequisitionPayload,
  RecruitmentRequisitionSummary,
} from '~/types/recruitment.type';

import {
  formatLabel,
  recruitmentCandidateStatusOrder,
  recruitmentTabDefinitions,
} from '../page.data';
import { useRecruitmentMutation } from './use-recruitment-mutation';

export type RecruitmentTab = (typeof recruitmentTabDefinitions)[number]['value'];

export function useRecruitmentPageController() {
  const queryClient = useQueryClient();
  const { hasPermission } = useRbac();

  const [activeTab, setActiveTab] = useState<RecruitmentTab>('requisitions');
  const [isRequisitionDialogOpen, setIsRequisitionDialogOpen] = useState(false);
  const [editingRequisition, setEditingRequisition] =
    useState<RecruitmentRequisitionSummary | null>(null);
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] =
    useState<RecruitmentCandidateSummary | null>(null);
  const [isInterviewDialogOpen, setIsInterviewDialogOpen] = useState(false);
  const [editingInterview, setEditingInterview] =
    useState<RecruitmentInterviewSummary | null>(null);
  const [interviewCandidateId, setInterviewCandidateId] = useState<string | null>(null);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const [feedbackInterviewId, setFeedbackInterviewId] = useState<string | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [noteCandidateId, setNoteCandidateId] = useState<string | null>(null);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<RecruitmentOfferSummary | null>(null);
  const [offerCandidateId, setOfferCandidateId] = useState<string | null>(null);
  const [isOnboardingDialogOpen, setIsOnboardingDialogOpen] = useState(false);
  const [editingOnboardingTask, setEditingOnboardingTask] =
    useState<RecruitmentOnboardingTaskSummary | null>(null);
  const [onboardingCandidateId, setOnboardingCandidateId] = useState<string | null>(null);

  const dashboardQuery = useQuery({
    queryFn: getRecruitmentDashboardService,
    queryKey: ['recruitment-dashboard'],
  });

  const optionsQuery = useQuery({
    queryFn: getRecruitmentOptionsService,
    queryKey: ['recruitment-options'],
  });

  const invalidateRecruitment = async () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['recruitment-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['recruitment-options'] }),
    ]);

  const closeRequisitionDialog = () => {
    setEditingRequisition(null);
    setIsRequisitionDialogOpen(false);
  };
  const closeCandidateDialog = () => {
    setEditingCandidate(null);
    setIsCandidateDialogOpen(false);
  };
  const closeInterviewDialog = () => {
    setEditingInterview(null);
    setInterviewCandidateId(null);
    setIsInterviewDialogOpen(false);
  };
  const closeFeedbackDialog = () => {
    setFeedbackInterviewId(null);
    setIsFeedbackDialogOpen(false);
  };
  const closeNoteDialog = () => {
    setNoteCandidateId(null);
    setIsNoteDialogOpen(false);
  };
  const closeOfferDialog = () => {
    setEditingOffer(null);
    setOfferCandidateId(null);
    setIsOfferDialogOpen(false);
  };
  const closeOnboardingDialog = () => {
    setEditingOnboardingTask(null);
    setOnboardingCandidateId(null);
    setIsOnboardingDialogOpen(false);
  };

  const createRequisitionMutation = useRecruitmentMutation<RecruitmentRequisitionPayload>({
    errorMessage: 'Unable to create requisition',
    invalidate: invalidateRecruitment,
    mutationFn: createRecruitmentRequisitionService,
    onSuccess: closeRequisitionDialog,
  });
  const updateRequisitionMutation = useRecruitmentMutation<{
    id: string;
    payload: Partial<RecruitmentRequisitionPayload>;
  }>({
    errorMessage: 'Unable to update requisition',
    invalidate: invalidateRecruitment,
    mutationFn: ({ id, payload }) => updateRecruitmentRequisitionService(id, payload),
    onSuccess: closeRequisitionDialog,
  });
  const deleteRequisitionMutation = useRecruitmentMutation<string>({
    errorMessage: 'Unable to delete requisition',
    invalidate: invalidateRecruitment,
    mutationFn: deleteRecruitmentRequisitionService,
  });

  const createCandidateMutation = useRecruitmentMutation<RecruitmentCandidatePayload>({
    errorMessage: 'Unable to add candidate',
    invalidate: invalidateRecruitment,
    mutationFn: createRecruitmentCandidateService,
    onSuccess: closeCandidateDialog,
  });
  const updateCandidateMutation = useRecruitmentMutation<{
    id: string;
    payload: Partial<RecruitmentCandidatePayload>;
  }>({
    errorMessage: 'Unable to update candidate',
    invalidate: invalidateRecruitment,
    mutationFn: ({ id, payload }) => updateRecruitmentCandidateService(id, payload),
    onSuccess: closeCandidateDialog,
  });
  const deleteCandidateMutation = useRecruitmentMutation<string>({
    errorMessage: 'Unable to delete candidate',
    invalidate: invalidateRecruitment,
    mutationFn: deleteRecruitmentCandidateService,
  });

  const createInterviewMutation = useRecruitmentMutation<RecruitmentInterviewPayload>({
    errorMessage: 'Unable to schedule interview',
    invalidate: invalidateRecruitment,
    mutationFn: createRecruitmentInterviewService,
    onSuccess: closeInterviewDialog,
  });
  const updateInterviewMutation = useRecruitmentMutation<{
    id: string;
    payload: Partial<RecruitmentInterviewPayload>;
  }>({
    errorMessage: 'Unable to update interview',
    invalidate: invalidateRecruitment,
    mutationFn: ({ id, payload }) => updateRecruitmentInterviewService(id, payload),
    onSuccess: closeInterviewDialog,
  });
  const deleteInterviewMutation = useRecruitmentMutation<string>({
    errorMessage: 'Unable to delete interview',
    invalidate: invalidateRecruitment,
    mutationFn: deleteRecruitmentInterviewService,
  });

  const createFeedbackMutation = useRecruitmentMutation<RecruitmentFeedbackPayload>({
    errorMessage: 'Unable to record feedback',
    invalidate: invalidateRecruitment,
    mutationFn: createRecruitmentFeedbackService,
    onSuccess: closeFeedbackDialog,
  });
  const createNoteMutation = useRecruitmentMutation<{
    candidateId: string;
    payload: RecruitmentCandidateNotePayload;
  }>({
    errorMessage: 'Unable to add note',
    invalidate: invalidateRecruitment,
    mutationFn: ({ candidateId, payload }) =>
      createRecruitmentCandidateNoteService(candidateId, payload),
    onSuccess: closeNoteDialog,
  });

  const createOfferMutation = useRecruitmentMutation<RecruitmentOfferPayload>({
    errorMessage: 'Unable to create offer',
    invalidate: invalidateRecruitment,
    mutationFn: createRecruitmentOfferService,
    onSuccess: closeOfferDialog,
  });
  const updateOfferMutation = useRecruitmentMutation<{
    id: string;
    payload: Partial<RecruitmentOfferPayload>;
  }>({
    errorMessage: 'Unable to update offer',
    invalidate: invalidateRecruitment,
    mutationFn: ({ id, payload }) => updateRecruitmentOfferService(id, payload),
    onSuccess: closeOfferDialog,
  });
  const deleteOfferMutation = useRecruitmentMutation<string>({
    errorMessage: 'Unable to delete offer',
    invalidate: invalidateRecruitment,
    mutationFn: deleteRecruitmentOfferService,
  });

  const createOnboardingMutation = useRecruitmentMutation<RecruitmentOnboardingTaskPayload>({
    errorMessage: 'Unable to create onboarding task',
    invalidate: invalidateRecruitment,
    mutationFn: createRecruitmentOnboardingTaskService,
    onSuccess: closeOnboardingDialog,
  });
  const updateOnboardingMutation = useRecruitmentMutation<{
    id: string;
    payload: Partial<RecruitmentOnboardingTaskPayload>;
  }>({
    errorMessage: 'Unable to update onboarding task',
    invalidate: invalidateRecruitment,
    mutationFn: ({ id, payload }) =>
      updateRecruitmentOnboardingTaskService(id, payload),
    onSuccess: closeOnboardingDialog,
  });
  const deleteOnboardingMutation = useRecruitmentMutation<string>({
    errorMessage: 'Unable to delete onboarding task',
    invalidate: invalidateRecruitment,
    mutationFn: deleteRecruitmentOnboardingTaskService,
  });

  const dashboard = dashboardQuery.data?.data as RecruitmentDashboardResponse | undefined;
  const options = (optionsQuery.data?.data ?? {
    candidates: [],
    departments: [],
    employees: [],
    interviews: [],
    offers: [],
    requisitions: [],
  }) as RecruitmentOptionsResponse;

  const canCreateRequisition = hasPermission('recruitment', 'create', 'team');
  const canEditRequisition = hasPermission('recruitment', 'edit', 'team');
  const canManageCandidates = hasPermission('recruitment', 'manage_candidates', 'team');
  const canScheduleInterviews = hasPermission('recruitment', 'schedule_interviews', 'team');
  const canManageOffers = hasPermission('recruitment', 'manage_offers', 'team');
  const canManageOnboarding = hasPermission('recruitment', 'manage_onboarding', 'team');
  const canRecordFeedback = hasPermission('recruitment', 'record_feedback', 'team');
  const canAddNotes = hasPermission('recruitment', 'add_notes', 'team');

  const metricsItems = useMemo(() => {
    if (!dashboard?.metrics) return [];
    return [
      {
        hint: 'Open, draft, and on-hold requisitions still being worked',
        icon: <BriefcaseBusiness className="h-4 w-4" />,
        label: 'Open Requisitions',
        value: dashboard.metrics.openRequisitions.toString(),
      },
      {
        hint: 'Candidates still moving through sourcing, screening, interviews, and offers',
        icon: <UsersRound className="h-4 w-4" />,
        label: 'Active Candidates',
        value: dashboard.metrics.activeCandidates.toString(),
      },
      {
        hint: 'Interviews falling in the current work week',
        icon: <CalendarClock className="h-4 w-4" />,
        label: 'Interviews This Week',
        value: dashboard.metrics.interviewsThisWeek.toString(),
      },
      {
        hint: 'Draft, approval-pending, and sent offers still in motion',
        icon: <FileCheck2 className="h-4 w-4" />,
        label: 'Offers In Progress',
        value: dashboard.metrics.offersInProgress.toString(),
      },
    ];
  }, [dashboard?.metrics]);

  const candidateStageCards = useMemo(() => {
    if (!dashboard?.candidateStatusCounts) return [];
    return recruitmentCandidateStatusOrder.map((status) => ({
      hint: `${formatLabel(status)} candidates`,
      label: formatLabel(status),
      value: String(dashboard.candidateStatusCounts[status] ?? 0),
    }));
  }, [dashboard?.candidateStatusCounts]);

  const primaryActionLabel = {
    candidates: 'Add Candidate',
    interviews: 'Schedule Interview',
    offers: 'Create Offer',
    requisitions: 'New Requisition',
    onboarding: 'Add Task',
  }[activeTab as 'requisitions' | 'candidates' | 'interviews' | 'offers' | 'onboarding'];

  const canShowPrimaryAction =
    (activeTab === 'requisitions' && (canCreateRequisition || canEditRequisition)) ||
    (activeTab === 'candidates' && canManageCandidates) ||
    (activeTab === 'interviews' && canScheduleInterviews) ||
    (activeTab === 'offers' && canManageOffers) ||
    (activeTab === 'onboarding' && canManageOnboarding);

  const latestInterviewIdForCandidate = (candidateId: string) =>
    dashboard?.interviews.find((interview) => interview.candidate_id === candidateId)?.id ??
    null;

  return {
    activeTab,
    canAddNotes,
    canEditRequisition,
    canManageCandidates,
    canManageOffers,
    canManageOnboarding,
    canRecordFeedback,
    canScheduleInterviews,
    canShowPrimaryAction,
    candidateStageCards,
    closeCandidateDialog,
    closeFeedbackDialog,
    closeInterviewDialog,
    closeNoteDialog,
    closeOfferDialog,
    closeOnboardingDialog,
    closeRequisitionDialog,
    createCandidateMutation,
    createFeedbackMutation,
    createInterviewMutation,
    createNoteMutation,
    createOfferMutation,
    createOnboardingMutation,
    createRequisitionMutation,
    dashboard,
    dashboardQuery,
    deleteCandidateMutation,
    deleteInterviewMutation,
    deleteOfferMutation,
    deleteOnboardingMutation,
    deleteRequisitionMutation,
    editingCandidate,
    editingInterview,
    editingOffer,
    editingOnboardingTask,
    editingRequisition,
    feedbackInterviewId,
    interviewCandidateId,
    isCandidateDialogOpen,
    isFeedbackDialogOpen,
    isInterviewDialogOpen,
    isNoteDialogOpen,
    isOfferDialogOpen,
    isOnboardingDialogOpen,
    isRequisitionDialogOpen,
    latestInterviewIdForCandidate,
    metricsItems,
    noteCandidateId,
    offerCandidateId,
    onboardingCandidateId,
    options,
    primaryActionLabel,
    setActiveTab,
    setEditingCandidate,
    setEditingInterview,
    setEditingOffer,
    setEditingOnboardingTask,
    setEditingRequisition,
    setFeedbackInterviewId,
    setInterviewCandidateId,
    setIsCandidateDialogOpen,
    setIsFeedbackDialogOpen,
    setIsInterviewDialogOpen,
    setIsNoteDialogOpen,
    setIsOfferDialogOpen,
    setIsOnboardingDialogOpen,
    setIsRequisitionDialogOpen,
    setNoteCandidateId,
    setOfferCandidateId,
    setOnboardingCandidateId,
    updateCandidateMutation,
    updateInterviewMutation,
    updateOfferMutation,
    updateOnboardingMutation,
    updateRequisitionMutation,
  };
}

export type RecruitmentPageController = ReturnType<
  typeof useRecruitmentPageController
>;
