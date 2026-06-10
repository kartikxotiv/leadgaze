'use client';

import type { ReactNode } from 'react';

import { FileCheck2, MessageSquarePlus, Plus } from 'lucide-react';

import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import { TableStatusMetricTab } from '@kit/ui/table-status-metric-tab';
import { Tabs, TabsContent } from '@kit/ui/tabs';

import { RecruitmentActivityTab } from '../../components/recruitment/recruitment-activity-tab';
import { RecruitmentCandidatesTab } from '../../components/recruitment/recruitment-candidates-tab';
import { RecruitmentDialogs } from '../../components/recruitment/recruitment-dialogs';
import { RecruitmentInterviewsTab } from '../../components/recruitment/recruitment-interviews-tab';
import { RecruitmentOffersTab } from '../../components/recruitment/recruitment-offers-tab';
import { RecruitmentOnboardingTab } from '../../components/recruitment/recruitment-onboarding-tab';
import { RecruitmentOverview } from '../../components/recruitment/recruitment-overview';
import { RecruitmentRequisitionsTab } from '../../components/recruitment/recruitment-requisitions-tab';
import { useRecruitmentPageController } from '../../hooks/use-recruitment-page-controller';
import { recruitmentTabDefinitions } from './page.data';

export function RecruitmentPage(props: {
  headerActions?: ReactNode;
  workspaceName?: string;
}) {
  const controller = useRecruitmentPageController();
  const activeCount = getRecruitmentTabCount(
    controller.activeTab,
    controller.dashboard,
  );
  const openPrimaryAction = () => {
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
  };

  return (
    <section className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
      <div className="flex w-full min-w-0 max-w-full shrink-0 flex-col overflow-hidden">
        <PageHeader
          title={`Recruitment (${activeCount})`}
          description={
            props.workspaceName
              ? `${props.workspaceName} hiring pipeline`
              : 'Hiring pipeline'
          }
        >
          {props.headerActions}
        </PageHeader>

        <div className="w-full min-w-0 max-w-full overflow-x-auto pb-2">
          <div className="flex flex-wrap items-center gap-2">
            {recruitmentTabDefinitions.map((tab) => (
              <TableStatusMetricTab
                key={tab.value}
                id={tab.value}
                color={getRecruitmentTabColor(tab.value)}
                statusName={tab.label}
                count={getRecruitmentTabCount(tab.value, controller.dashboard)}
                isSelected={controller.activeTab === tab.value}
                onClick={() => controller.setActiveTab(tab.value)}
              />
            ))}
          </div>
        </div>

        <div className="w-full min-w-0 max-w-full shrink-0 border-b pb-2">
          <ListToolBar
            actions={[
              {
                key: 'primary',
                label: controller.primaryActionLabel ?? 'New Item',
                icon: Plus,
                onClick: openPrimaryAction,
                show:
                  Boolean(controller.primaryActionLabel) &&
                  controller.canShowPrimaryAction,
                buttonVariant: 'default',
              },
              {
                key: 'note',
                label: 'Add Note',
                icon: MessageSquarePlus,
                onClick: () => {
                  controller.closeNoteDialog();
                  controller.setIsNoteDialogOpen(true);
                },
                show: controller.canAddNotes,
                buttonVariant: 'outline',
              },
              {
                key: 'feedback',
                label: 'Record Feedback',
                icon: FileCheck2,
                onClick: () => {
                  controller.closeFeedbackDialog();
                  controller.setIsFeedbackDialogOpen(true);
                },
                show: controller.canRecordFeedback,
                buttonVariant: 'outline',
              },
            ]}
          />
        </div>
      </div>

      <PageBody className="bg-sidebar sticky flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden pt-3">
        <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col gap-4 overflow-y-auto pb-6">
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
            <CardWidgetContainer title="Loading recruitment data">
              <div className="text-muted-foreground p-6 text-sm">
                Loading recruitment data...
              </div>
            </CardWidgetContainer>
          ) : null}
        </div>
      </PageBody>

      <RecruitmentDialogs controller={controller} />
    </section>
  );
}

function getRecruitmentTabCount(
  tab: (typeof recruitmentTabDefinitions)[number]['value'],
  dashboard: ReturnType<typeof useRecruitmentPageController>['dashboard'],
) {
  if (!dashboard) {
    return 0;
  }

  if (tab === 'requisitions') {
    return dashboard.requisitions.length;
  }

  if (tab === 'candidates') {
    return dashboard.candidates.length;
  }

  if (tab === 'interviews') {
    return dashboard.interviews.length;
  }

  if (tab === 'offers') {
    return dashboard.offers.length;
  }

  if (tab === 'onboarding') {
    return dashboard.onboardingTasks.length;
  }

  return dashboard.feedback.length + dashboard.notes.length;
}

function getRecruitmentTabColor(
  tab: (typeof recruitmentTabDefinitions)[number]['value'],
) {
  const colors = {
    activity: '#8b5cf6',
    candidates: '#22c55e',
    interviews: '#f59e0b',
    offers: '#6366f1',
    onboarding: '#0ea5e9',
    requisitions: '#4eacff',
  } as const;

  return colors[tab];
}
