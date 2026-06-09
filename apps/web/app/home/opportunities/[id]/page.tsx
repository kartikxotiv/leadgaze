'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Edit2,
  FileText,
  Flag,
  Mail,
  Phone,
  Tag,
  Target,
  Trash2,
  User,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CustomInputForView } from '@kit/ui/custom-input-for-view';
import { DetailHeader } from '@kit/ui/detail-header';
import { PageBody } from '@kit/ui/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { type Contact, getContactsService } from '~/services/contacts.service';
import { getWorkspaceEmailAccountService } from '~/services/email.service';
import {
  getOpportunityByIdService,
  updateOpportunityService,
} from '~/services/opportunities.service';
import { getOpportunityStatusesService } from '~/services/opportunities.service';

import { DeleteEntityDialog } from '../../_components/delete-entity-dialog';
import {
  EntityDocuments,
  EntityMeetings,
  EntityReminders,
} from '../../_components/entity-activity';
import { EntityCalls } from '../../_components/entity-calls';
import { EntityEmails } from '../../_components/entity-emails';
import { EntityNotes } from '../../_components/entity-notes';
import { EmailLeadDialog } from '../../leads/components/email-lead-dialog';
import { LogCallDialog } from '../../leads/components/log-call-dialog';
import { EditOpportunityDialog } from '../components/edit-opportunity-dialog';
import { OpportunityAssignees } from '../components/opportunity-assignees';
import { OpportunityStatusTimeline } from '../components/opportunity-status-timeline';

function OpportunityDetailsSkeleton() {
  return (
    <ModuleGuard module="opportunities">
      <div className="px-6 pt-4 pb-2">
        <div className="mb-2">
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
      <PageBody className="pb-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <DetailHeader
              avatar={<Skeleton className="h-16 w-16 rounded-md" />}
              title={<Skeleton className="h-6 w-48" />}
              subtitle={
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>
              }
              actions={
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-28 rounded-md" />
                </div>
              }
            />
            {/* Pipeline timeline skeleton */}
            <Card>
              <CardContent className="p-4">
                <Skeleton className="h-12 w-full rounded-md" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-md" />
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageBody>
    </ModuleGuard>
  );
}

export default function OpportunityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params?.id as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLogCallDialogOpen, setIsLogCallDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  const {
    data: opportunity,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => getOpportunityByIdService(id),
    enabled: !!id,
  });

  useEffect(() => {
    if (opportunity) {
      console.log('[DEBUG] Opportunity:', opportunity);
    }
  }, [opportunity]);

  const { currentWorkspace, canAccess: rbacCanAccess } = useRBAC();
  const { data: stages = [] } = useQuery({
    queryKey: ['opportunity-stages', currentWorkspace?.id],
    queryFn: () => getOpportunityStatusesService(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });

  const { data: workspaceEmailAccounts = [] } = useQuery({
    queryKey: ['workspace-email-accounts', currentWorkspace?.id],
    queryFn: () => getWorkspaceEmailAccountService(currentWorkspace?.id || ''),
    enabled: !!currentWorkspace?.id,
  });

  const { data: accountContactsData } = useQuery({
    queryKey: ['contacts', 'opportunity-account', opportunity?.account_id],
    queryFn: () =>
      getContactsService({
        workspaceId: opportunity!.workspace_id,
        accountId: opportunity!.account_id,
        limit: 1000,
      }),
    enabled: !!opportunity?.workspace_id && !!opportunity?.account_id,
  });
  const accountContacts = accountContactsData?.data || [];
  const opportunityEmailRecipients = useMemo(
    () =>
      accountContacts.flatMap((contact: Contact) => {
        const name =
          `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
          contact.email ||
          'Contact';

        return [
          ...(contact.email
            ? [
                {
                  email: contact.email,
                  name,
                  label: 'Primary Email',
                },
              ]
            : []),
          ...(contact.alt_email
            ? [
                {
                  email: contact.alt_email,
                  name,
                  label: 'Alt Email',
                },
              ]
            : []),
        ];
      }),
    [accountContacts],
  );

  const { data: user } = useUser();
  const editPermission = usePermissionDetail('opportunities', 'edit');
  const canEdit = useCanAccessData(
    editPermission,
    opportunity?.owner_id,
    user?.id,
  );

  const changeStagePermission = usePermissionDetail(
    'opportunities',
    'change_stage',
  );
  const canChangeStage = useCanAccessData(
    changeStagePermission,
    opportunity?.owner_id,
    user?.id,
  );

  const closeWonPermission = usePermissionDetail('opportunities', 'close_won');
  const canCloseWon = useCanAccessData(
    closeWonPermission,
    opportunity?.owner_id,
    user?.id,
  );

  const closeLostPermission = usePermissionDetail(
    'opportunities',
    'close_lost',
  );
  const canCloseLost = useCanAccessData(
    closeLostPermission,
    opportunity?.owner_id,
    user?.id,
  );

  if (!currentWorkspace || isLoading) {
    return <OpportunityDetailsSkeleton />;
  }

  if (error || !opportunity) {
    return (
      <ModuleGuard module="opportunities">
        <div className="flex h-screen flex-col items-center justify-center gap-4">
          <h1 className="text-2xl font-bold">Opportunity Not Found</h1>
          <p className="text-muted-foreground">
            The opportunity you're looking for doesn't exist or you don't have
            permission to view it.
          </p>
          <Button asChild variant="outline">
            <Link href="/home/opportunities">Back to Opportunities</Link>
          </Button>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="opportunities">
      <div className="pt-4 pb-2 flex justify-between items-center w-full">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="border p-0 border-leadgaze-border">
            <Link href="/home/opportunities">
              <ArrowLeft className="ml-2 mr-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">Opportunity details</h1>
            <p className="text-leadgaze-muted text-sm">View and edit opportunity information</p>
          </div>
        </div>
        {canEdit && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Opportunity
          </Button>
        )}
      </div>

      <PageBody className="pb-6">
        <DeleteEntityDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entityId={id}
          entityType="opportunity"
          entityName={opportunity.opportunity_name}
          onSuccess={() => router.push('/home/opportunities')}
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            <DetailHeader
              avatar={
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                  <FileText className="h-8 w-8 text-white" />
                </div>
              }
              title={opportunity.opportunity_name}
              subtitle={
                <>
                  {opportunity.account && (
                    <Link
                      href={`/home/accounts/${opportunity.account.id}`}
                      className="text-primary flex items-center gap-1 hover:underline"
                    >
                      <Building2 className="h-3 w-3" />
                      {opportunity.account.account_name}
                    </Link>
                  )}
                  {opportunity.type && (
                    <span className="flex items-center gap-1 text-sm text-gray-500">
                      • {opportunity.type}
                    </span>
                  )}
                  <div className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block dark:bg-gray-600" />
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      Created on{' '}
                      {new Date(opportunity.created_at).toLocaleDateString(
                        undefined,
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        },
                      )}
                    </span>
                  </div>
                </>
              }
              actions={
                <div className="flex gap-2">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLogCallDialogOpen(true)}
                      className="p-3"
                      title="Log a call"
                    >
                      <div className="flex items-center justify-center rounded-full bg-[#44bbb3] p-2">
                        <Phone className="h-3 w-3 text-white" />
                      </div>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className={`flex h-8 w-8 items-center justify-center overflow-hidden p-0 ${
                      opportunityEmailRecipients.length === 0 ? 'opacity-50' : ''
                    }`}
                    disabled={opportunityEmailRecipients.length === 0}
                    onClick={() => setIsEmailDialogOpen(true)}
                    title={
                      opportunityEmailRecipients.length === 0
                        ? 'Opportunity account has no contact email addresses'
                        : 'Send email to opportunity contact'
                    }
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-400">
                      <Mail className="h-3.5 w-3.5 text-white" />
                    </div>
                  </Button>

                  {rbacCanAccess('opportunities', 'change_stage') && (
                    <Select
                      value={opportunity.stage_id}
                      onValueChange={async (value) => {
                        try {
                          await updateOpportunityService(id, { stage_id: value });
                          toast.success('Opportunity stage updated');
                          refetch();
                        } catch (error) {
                          toast.error('Failed to update stage');
                        }
                      }}
                      disabled={!canChangeStage}
                    >
                      <SelectTrigger className="h-9 w-[180px]">
                        <SelectValue placeholder="Update Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages
                          .filter((stage: any) => {
                            const isWon =
                              stage.status_name.toLowerCase().includes('won') ||
                              stage.is_won;
                            const isLost =
                              stage.status_name.toLowerCase().includes('lost') ||
                              stage.is_lost;

                            if (isWon && !canCloseWon) return false;
                            if (isLost && !canCloseLost) return false;
                            return true;
                          })
                          .map((stage: any) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                                {stage.status_name}
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  {rbacCanAccess('opportunities', 'close_won') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-600 text-green-600 hover:bg-green-50"
                      disabled={!canCloseWon}
                      onClick={async () => {
                        const wonStage = stages.find(
                          (s: any) =>
                            s.status_name.toLowerCase().includes('won') || s.is_won,
                        );
                        if (wonStage) {
                          try {
                            await updateOpportunityService(id, {
                              stage_id: wonStage.id,
                              is_closed: true,
                              is_won: true,
                            });
                            toast.success('Opportunity marked as Won');
                            refetch();
                          } catch (error) {
                            toast.error('Failed to update status');
                          }
                        }
                      }}
                    >
                      Close as Won
                    </Button>
                  )}

                  {rbacCanAccess('opportunities', 'close_lost') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-600 hover:bg-red-50"
                      disabled={!canCloseLost}
                      onClick={async () => {
                        const lostStage = stages.find(
                          (s: any) =>
                            s.status_name.toLowerCase().includes('lost') || s.is_lost,
                        );
                        if (lostStage) {
                          try {
                            await updateOpportunityService(id, {
                              stage_id: lostStage.id,
                              is_closed: true,
                              is_won: false,
                            });
                            toast.success('Opportunity marked as Lost');
                            refetch();
                          } catch (error) {
                            toast.error('Failed to update status');
                          }
                        }
                      }}
                    >
                      Close as Lost
                    </Button>
                  )}
                </div>
              }
            />

            {/* Sales Pipeline Timeline */}
            <Card className="bg-card overflow-hidden border shadow-sm">
              <CardContent className="p-4">
                <p className="text-muted-foreground mb-4 text-center text-[10px] font-bold tracking-widest uppercase">
                  Opportunity Sales Pipeline
                </p>
                <OpportunityStatusTimeline
                  opportunityId={id}
                  currentStatusId={opportunity.stage_id}
                  statuses={stages}
                  onStatusChange={refetch}
                  canEdit={canEdit}
                />
              </CardContent>
            </Card>

            {/* Details */}
            <CardWidgetContainer
              title="Details"
              icon={<User className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
            >
              <div className="flex-1">
                <div className="grid grid-cols-1 gap-4 px-6 py-3 md:grid-cols-2">
                  <CustomInputForView
                    label="Amount"
                    labelIcon={<Wallet className="text-muted-foreground h-4 w-4" />}
                    value={new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: opportunity.currency || 'USD',
                    }).format(opportunity.amount || 0)}
                  />

                  <CustomInputForView
                    label="Expected Revenue"
                    labelIcon={<Target className="text-muted-foreground h-4 w-4" />}
                    value={new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: opportunity.currency || 'USD',
                    }).format(opportunity.expected_revenue || 0)}
                  />

                  <CustomInputForView
                    label="Expected Close Date"
                    labelIcon={<Calendar className="text-muted-foreground h-4 w-4" />}
                    value={opportunity.expected_close_date
                      ? new Date(opportunity.expected_close_date).toLocaleDateString()
                      : '-'}
                  />

                  <CustomInputForView
                    label="Probability"
                    labelIcon={<CheckCircle className="text-muted-foreground h-4 w-4" />}
                    value={`${opportunity.probability}%`}
                  />

                  <CustomInputForView
                    label="Priority"
                    labelIcon={<Flag className="text-muted-foreground h-4 w-4" />}
                    value={opportunity.priority ? opportunity.priority.charAt(0).toUpperCase() + opportunity.priority.slice(1) : '-'}
                  />

                  <CustomInputForView
                    label="Lead Source"
                    value={opportunity.lead_source || '-'}
                  />

                  {opportunity.description && (
                    <CustomInputForView
                      label="Description"
                      value={opportunity.description}
                      as="textarea"
                      className="col-span-2"
                    />
                  )}

                  {opportunity.competitor && (
                    <CustomInputForView
                      label="Competitor"
                      value={opportunity.competitor}
                      className="col-span-2"
                    />
                  )}
                </div>
              </div>
            </CardWidgetContainer>

            {/* Notes Section */}
            <EntityNotes entityType="opportunity" entityId={id} />

            {/* Danger Zone */}
            {rbacCanAccess('opportunities', 'delete') && (
              <Card className="border-destructive/50 border-solid">
                <CardHeader>
                  <CardTitle className="text-destructive text-lg"></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Delete Opportunity</p>
                      <p className="text-muted-foreground text-sm">
                        Once you delete an opportunity, there is no going back.
                        Please be certain.
                      </p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="destructive"
                              disabled={
                                !rbacCanAccess('opportunities', 'delete')
                              }
                              onClick={() => setDeleteDialogOpen(true)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Opportunity
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!rbacCanAccess('opportunities', 'delete') && (
                          <TooltipContent>
                            <p>You do not have permission to delete</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  System Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Owner
                  </p>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span className="text-sm">
                      {opportunity.owner?.name || '-'}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Created At
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">
                      {new Date(opportunity.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Created By
                  </p>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span className="text-sm">
                      {opportunity.created_by_account?.name ||
                        opportunity.created_by ||
                        '-'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs font-medium">
                    Last Updated
                  </p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">
                      {new Date(opportunity.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opportunity Assignees Section */}
            {currentWorkspace?.id && (
              <OpportunityAssignees
                opportunityId={id}
                workspaceId={currentWorkspace.id}
              />
            )}

            {/* Activity Sections */}
            <EntityCalls entityType="opportunity" entityId={id} />
            <EntityEmails
              entityId={id}
              entityType="opportunity"
              entityName={opportunity.opportunity_name}
              recipientOptions={opportunityEmailRecipients}
            />
            <EntityReminders entityType="opportunity" entityId={id} />
            <EntityMeetings entityType="opportunity" entityId={id} />
            <EntityDocuments entityType="opportunity" entityId={id} />
          </div>
        </div>
      </PageBody>

      <EditOpportunityDialog
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        opportunity={opportunity}
      />

      {currentWorkspace?.id && (
        <LogCallDialog
          open={isLogCallDialogOpen}
          onOpenChange={setIsLogCallDialogOpen}
          onSuccess={async () => {
            setIsLogCallDialogOpen(false);
            await queryClient.invalidateQueries({
              queryKey: ['calls', currentWorkspace.id, 'opportunity', id],
            });
          }}
          entityType="opportunity"
          entityId={id}
          workspaceId={currentWorkspace.id}
          defaultContactName={opportunity.opportunity_name}
        />
      )}

      <EmailLeadDialog
        open={isEmailDialogOpen}
        onOpenChange={setIsEmailDialogOpen}
        leadName={opportunity.opportunity_name}
        recipientOptions={opportunityEmailRecipients}
        workspaceEmailAccounts={workspaceEmailAccounts}
        entityId={id}
        entityType="opportunity"
      />
    </ModuleGuard>
  );
}
