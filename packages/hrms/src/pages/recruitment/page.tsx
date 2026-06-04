'use client';

import { Card, CardContent } from '@kit/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { RecruitmentActivityTab } from '../../components/recruitment/recruitment-activity-tab';
import { RecruitmentCandidatesTab } from '../../components/recruitment/recruitment-candidates-tab';
import { RecruitmentDialogs } from '../../components/recruitment/recruitment-dialogs';
import { RecruitmentInterviewsTab } from '../../components/recruitment/recruitment-interviews-tab';
import { RecruitmentOffersTab } from '../../components/recruitment/recruitment-offers-tab';
import { RecruitmentOnboardingTab } from '../../components/recruitment/recruitment-onboarding-tab';
import { RecruitmentOverview } from '../../components/recruitment/recruitment-overview';
import { RecruitmentPageActions } from '../../components/recruitment/recruitment-page-actions';
import { RecruitmentRequisitionsTab } from '../../components/recruitment/recruitment-requisitions-tab';
import { useRecruitmentPageController } from '../../hooks/use-recruitment-page-controller';
import { recruitmentTabDefinitions } from './page.data';

export function RecruitmentPage() {
  const controller = useRecruitmentPageController();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={controller.activeTab}
          onValueChange={(value) =>
            controller.setActiveTab(value as typeof controller.activeTab)
          }
        >
          <TabsList className="h-auto flex-wrap justify-start">
            {recruitmentTabDefinitions.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <RecruitmentPageActions
          canAddNotes={controller.canAddNotes}
          canRecordFeedback={controller.canRecordFeedback}
          canShowPrimaryAction={controller.canShowPrimaryAction}
          primaryActionLabel={controller.primaryActionLabel}
          onAddFeedback={() => {
            controller.closeFeedbackDialog();
            controller.setIsFeedbackDialogOpen(true);
          }}
          onAddNote={() => {
            controller.closeNoteDialog();
            controller.setIsNoteDialogOpen(true);
          }}
          onPrimaryAction={() => {
            if (controller.activeTab === 'requisitions') {
              controller.closeRequisitionDialog();
              controller.setIsRequisitionDialogOpen(true);
            }
            if (controller.activeTab === 'candidates') {
              controller.closeCandidateDialog();
              controller.setIsCandidateDialogOpen(true);
            }
            if (controller.activeTab === 'interviews') {
              controller.closeInterviewDialog();
              controller.setIsInterviewDialogOpen(true);
            }
            if (controller.activeTab === 'offers') {
              controller.closeOfferDialog();
              controller.setIsOfferDialogOpen(true);
            }
            if (controller.activeTab === 'onboarding') {
              controller.closeOnboardingDialog();
              controller.setIsOnboardingDialogOpen(true);
            }
          }}
        />
      </div>

      <RecruitmentOverview
        candidateStageCards={controller.candidateStageCards}
        metricsItems={controller.metricsItems}
      />

      <Tabs
        value={controller.activeTab}
        onValueChange={(value) =>
          controller.setActiveTab(value as typeof controller.activeTab)
        }
      >
        <TabsContent value="requisitions" className="mt-0">
          <RecruitmentRequisitionsTab
            canEditRequisition={controller.canEditRequisition}
            requisitions={controller.dashboard?.requisitions ?? []}
            onDelete={(id) => {
              if (confirm('Delete this requisition and its pipeline?')) {
                controller.deleteRequisitionMutation.mutate(id);
              }
            }}
            onEdit={(requisition) => {
              controller.setEditingRequisition(requisition);
              controller.setIsRequisitionDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="candidates" className="mt-0">
          <RecruitmentCandidatesTab
            canAddNotes={controller.canAddNotes}
            canManageCandidates={controller.canManageCandidates}
            canRecordFeedback={controller.canRecordFeedback}
            candidates={controller.dashboard?.candidates ?? []}
            latestInterviewIdForCandidate={
              controller.latestInterviewIdForCandidate
            }
            onAddFeedback={(interviewId) => {
              controller.setFeedbackInterviewId(interviewId);
              controller.setIsFeedbackDialogOpen(true);
            }}
            onAddNote={(candidateId) => {
              controller.setNoteCandidateId(candidateId);
              controller.setIsNoteDialogOpen(true);
            }}
            onDelete={(id) => {
              if (confirm('Delete this candidate and related activity?')) {
                controller.deleteCandidateMutation.mutate(id);
              }
            }}
            onEdit={(candidate) => {
              controller.setEditingCandidate(candidate);
              controller.setIsCandidateDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="interviews" className="mt-0">
          <RecruitmentInterviewsTab
            canRecordFeedback={controller.canRecordFeedback}
            canScheduleInterviews={controller.canScheduleInterviews}
            interviews={controller.dashboard?.interviews ?? []}
            onAddFeedback={(interviewId) => {
              controller.setFeedbackInterviewId(interviewId);
              controller.setIsFeedbackDialogOpen(true);
            }}
            onDelete={(id) => {
              if (confirm('Delete this interview?')) {
                controller.deleteInterviewMutation.mutate(id);
              }
            }}
            onEdit={(interview) => {
              controller.setEditingInterview(interview);
              controller.setIsInterviewDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="offers" className="mt-0">
          <RecruitmentOffersTab
            canManageOffers={controller.canManageOffers}
            canManageOnboarding={controller.canManageOnboarding}
            offers={controller.dashboard?.offers ?? []}
            onCreateChecklist={(candidateId) => {
              controller.setOnboardingCandidateId(candidateId);
              controller.setIsOnboardingDialogOpen(true);
            }}
            onDelete={(id) => {
              if (confirm('Delete this offer?')) {
                controller.deleteOfferMutation.mutate(id);
              }
            }}
            onEdit={(offer) => {
              controller.setEditingOffer(offer);
              controller.setIsOfferDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="onboarding" className="mt-0">
          <RecruitmentOnboardingTab
            canManageOnboarding={controller.canManageOnboarding}
            onboardingTasks={controller.dashboard?.onboardingTasks ?? []}
            onDelete={(id) => {
              if (confirm('Delete this onboarding task?')) {
                controller.deleteOnboardingMutation.mutate(id);
              }
            }}
            onEdit={(task) => {
              controller.setEditingOnboardingTask(task);
              controller.setIsOnboardingDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <RecruitmentActivityTab
            feedback={controller.dashboard?.feedback ?? []}
            notes={controller.dashboard?.notes ?? []}
          />
        </TabsContent>
      </Tabs>

      {controller.dashboardQuery.isLoading ? (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            Loading recruitment data...
          </CardContent>
        </Card>
      ) : null}

      <RecruitmentDialogs controller={controller} />
    </section>
  );
}
