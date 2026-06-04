'use client';

import type { RecruitmentPageController } from '../../hooks/use-recruitment-page-controller';
import { RecruitmentCandidateDialog } from './recruitment-candidate-dialog';
import { RecruitmentFeedbackDialog } from './recruitment-feedback-dialog';
import { RecruitmentInterviewDialog } from './recruitment-interview-dialog';
import { RecruitmentNoteDialog } from './recruitment-note-dialog';
import { RecruitmentOfferDialog } from './recruitment-offer-dialog';
import { RecruitmentOnboardingTaskDialog } from './recruitment-onboarding-task-dialog';
import { RecruitmentRequisitionDialog } from './recruitment-requisition-dialog';

export function RecruitmentDialogs(props: {
  controller: RecruitmentPageController;
}) {
  const { controller } = props;

  return (
    <>
      <RecruitmentRequisitionDialog
        open={controller.isRequisitionDialogOpen}
        onOpenChange={(open) => {
          if (!open) controller.closeRequisitionDialog();
          else controller.setIsRequisitionDialogOpen(true);
        }}
        initialData={controller.editingRequisition}
        isPending={
          controller.createRequisitionMutation.isPending ||
          controller.updateRequisitionMutation.isPending
        }
        options={controller.options}
        onSubmit={(payload) => {
          if (controller.editingRequisition) {
            controller.updateRequisitionMutation.mutate({
              id: controller.editingRequisition.id,
              payload,
            });
            return;
          }
          controller.createRequisitionMutation.mutate(payload);
        }}
      />

      <RecruitmentCandidateDialog
        open={controller.isCandidateDialogOpen}
        onOpenChange={(open) => {
          if (!open) controller.closeCandidateDialog();
          else controller.setIsCandidateDialogOpen(true);
        }}
        initialData={controller.editingCandidate}
        isPending={
          controller.createCandidateMutation.isPending ||
          controller.updateCandidateMutation.isPending
        }
        options={controller.options}
        onSubmit={(payload) => {
          if (controller.editingCandidate) {
            controller.updateCandidateMutation.mutate({
              id: controller.editingCandidate.id,
              payload,
            });
            return;
          }
          controller.createCandidateMutation.mutate(payload);
        }}
      />

      <RecruitmentInterviewDialog
        open={controller.isInterviewDialogOpen}
        onOpenChange={(open) => {
          if (!open) controller.closeInterviewDialog();
          else controller.setIsInterviewDialogOpen(true);
        }}
        initialCandidateId={controller.interviewCandidateId}
        initialData={controller.editingInterview}
        isPending={
          controller.createInterviewMutation.isPending ||
          controller.updateInterviewMutation.isPending
        }
        options={controller.options}
        onSubmit={(payload) => {
          if (controller.editingInterview) {
            controller.updateInterviewMutation.mutate({
              id: controller.editingInterview.id,
              payload,
            });
            return;
          }
          controller.createInterviewMutation.mutate(payload);
        }}
      />

      <RecruitmentFeedbackDialog
        open={controller.isFeedbackDialogOpen}
        onOpenChange={(open) => {
          if (!open) controller.closeFeedbackDialog();
          else controller.setIsFeedbackDialogOpen(true);
        }}
        initialInterviewId={controller.feedbackInterviewId}
        isPending={controller.createFeedbackMutation.isPending}
        options={controller.options}
        onSubmit={(payload) =>
          controller.createFeedbackMutation.mutate(payload)
        }
      />

      <RecruitmentNoteDialog
        open={controller.isNoteDialogOpen}
        onOpenChange={(open) => {
          if (!open) controller.closeNoteDialog();
          else controller.setIsNoteDialogOpen(true);
        }}
        initialCandidateId={controller.noteCandidateId}
        isPending={controller.createNoteMutation.isPending}
        options={controller.options}
        onSubmit={(candidateId, payload) =>
          controller.createNoteMutation.mutate({ candidateId, payload })
        }
      />

      <RecruitmentOfferDialog
        open={controller.isOfferDialogOpen}
        onOpenChange={(open) => {
          if (!open) controller.closeOfferDialog();
          else controller.setIsOfferDialogOpen(true);
        }}
        initialCandidateId={controller.offerCandidateId}
        initialData={controller.editingOffer}
        isPending={
          controller.createOfferMutation.isPending ||
          controller.updateOfferMutation.isPending
        }
        options={controller.options}
        onSubmit={(payload) => {
          if (controller.editingOffer) {
            controller.updateOfferMutation.mutate({
              id: controller.editingOffer.id,
              payload,
            });
            return;
          }
          controller.createOfferMutation.mutate(payload);
        }}
      />

      <RecruitmentOnboardingTaskDialog
        open={controller.isOnboardingDialogOpen}
        onOpenChange={(open) => {
          if (!open) controller.closeOnboardingDialog();
          else controller.setIsOnboardingDialogOpen(true);
        }}
        initialCandidateId={controller.onboardingCandidateId}
        initialData={controller.editingOnboardingTask}
        isPending={
          controller.createOnboardingMutation.isPending ||
          controller.updateOnboardingMutation.isPending
        }
        options={controller.options}
        onSubmit={(payload) => {
          if (controller.editingOnboardingTask) {
            controller.updateOnboardingMutation.mutate({
              id: controller.editingOnboardingTask.id,
              payload,
            });
            return;
          }
          controller.createOnboardingMutation.mutate(payload);
        }}
      />
    </>
  );
}
