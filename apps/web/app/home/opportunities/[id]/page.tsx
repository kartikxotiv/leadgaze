'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Edit2,
  FileText,
  Flag,
  Mail,
  Phone,
  Plus,
  Settings,
  Tag,
  Target,
  Trash2,
  User,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react';
import { toast } from 'sonner';

import { CoreEmailComposeDialog } from '@kit/core/pages';
import { getCoreEmailAccountsService } from '@kit/core/services';
import { formatDate } from '@kit/shared/utils';
import { useUser } from '@kit/supabase/hooks/use-user';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@kit/ui/accordion';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader } from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { DetailHeader } from '@kit/ui/detail-header';
import { DetailInfoList, DetailInfoRow } from '@kit/ui/detail-info-row';
import { PageBody } from '@kit/ui/page';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { Skeleton } from '@kit/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { cn } from '@kit/ui/utils';

import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { type Contact, getContactsService } from '~/services/contacts.service';
import {
  getOpportunityByIdService,
  getOpportunityStatusesService,
  updateOpportunityService,
} from '~/services/opportunities.service';
import {
  assignOpportunityToUser,
  getOpportunityAssignees,
} from '~/services/opportunity-assignees.service';

import { CentralStatusManagementDialog } from '../../_components/central-status-management-dialog';
import { DeleteEntityDialog } from '../../_components/delete-entity-dialog';
import {
  EntityDocuments,
  EntityMeetings,
  EntityReminders,
} from '../../_components/entity-activity';
import { EntityCalls } from '../../_components/entity-calls';
import { EntityEmails } from '../../_components/entity-emails';
import { EntityNotes } from '../../_components/entity-notes';
import { ManageableStatusSelect } from '../../_components/manageable-status-select';
import { AssignUserModal } from '../../leads/components/assign-user-modal';
import { LogCallDialog } from '../../leads/components/log-call-dialog';
import { EditOpportunityDialog } from '../components/edit-opportunity-dialog';
import { OpportunityAssignees } from '../components/opportunity-assignees';

function OpportunityDetailsSkeleton() {
  return (
    <ModuleGuard module="opportunities">
      <div className="flex h-full flex-col">
        <div className="px-6 pt-4 pb-2">
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <PageBody>
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
      </div>
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
  const [openAccordion, setOpenAccordion] = useState<string>('');
  const [isManageStagesOpen, setIsManageStagesOpen] = useState(false);

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
  const canManageEmail = rbacCanAccess('emails', 'manage_email');

  // Page-level assign modal (works even when accordion is collapsed)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const { data: pageAssignees = [] } = useQuery({
    queryKey: ['opportunity-assignees', id],
    queryFn: async () => {
      const res = await getOpportunityAssignees(id);
      return (res?.data || res || []) as Array<{
        id: string;
        assigned_to_user_id: string;
        assignee_name?: string;
        assignee_email?: string;
        assignee_picture?: string;
        is_primary_assignee: boolean;
      }>;
    },
    enabled: !!id,
  });
  const pageAssignMutation = useMutation({
    mutationFn: (userId: string) =>
      assignOpportunityToUser(id, { assigned_to_user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['opportunity-assignees', id],
      });
      toast.success('User assigned to opportunity');
      setIsAssignModalOpen(false);
    },
    onError: (error: unknown) => {
      const response = (
        error as { response?: { data?: { message?: unknown } } }
      )?.response;
      const message =
        typeof response?.data?.message === 'string'
          ? response.data.message
          : 'Failed to assign user';
      toast.error(message);
    },
  });

  const { data: stages = [] } = useQuery({
    queryKey: ['opportunity-stages', currentWorkspace?.id],
    queryFn: () => getOpportunityStatusesService(currentWorkspace!.id),
    enabled: !!currentWorkspace?.id,
  });

  const { data: coreEmailAccounts = [] } = useQuery({
    queryKey: ['core-email-accounts', currentWorkspace?.id],
    queryFn: () => getCoreEmailAccountsService(currentWorkspace!.id),
    enabled: canManageEmail && !!currentWorkspace?.id,
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
            The opportunity you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have permission to view it.
          </p>
          <Button asChild variant="outline">
            <Link href="/home/sales/opportunities">Back to Opportunities</Link>
          </Button>
        </div>
      </ModuleGuard>
    );
  }

  return (
    <ModuleGuard module="opportunities">
      <div className="flex flex-wrap items-start gap-2 pt-4 pb-2 sm:flex-nowrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="border-leadgaze-border border p-0"
          >
            <Link href="/home/sales/opportunities">
              <ArrowLeft className="mr-2 ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">Opportunity details</h1>
            <p className="text-leadgaze-muted text-sm">
              View and edit opportunity information
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLogCallDialogOpen(true)}
                    className="gap-2"
                    title="Log a call"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="hidden lg:inline">Log Call</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Log Call</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {canManageEmail && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-2 ${opportunityEmailRecipients.length === 0 ? 'opacity-50' : ''}`}
                    disabled={opportunityEmailRecipients.length === 0}
                    onClick={() =>
                      opportunityEmailRecipients.length > 0 &&
                      setIsEmailDialogOpen(true)
                    }
                    title={
                      opportunityEmailRecipients.length === 0
                        ? 'Opportunity account has no contact email addresses'
                        : 'Send email to opportunity contact'
                    }
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden lg:inline">Send Email</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {opportunityEmailRecipients.length === 0
                    ? 'No emails available'
                    : 'Send Email'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {rbacCanAccess('opportunities', 'change_stage') && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <Popover>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canChangeStage}
                        className="gap-2"
                      >
                        <Workflow className="h-4 w-4" />
                        <span className="hidden lg:inline">Update Stage</span>
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Update Stage</TooltipContent>
                  <PopoverContent className="w-52 p-1" align="end">
                    <div className="flex flex-col">
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
                          <button
                            key={stage.id}
                            className={cn(
                              'hover:bg-accent flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                              opportunity.stage_id === stage.id &&
                                'bg-accent font-medium',
                            )}
                            onClick={async () => {
                              try {
                                await updateOpportunityService(id, {
                                  stage_id: stage.id,
                                });
                                toast.success('Opportunity stage updated');
                                refetch();
                              } catch {
                                toast.error('Failed to update stage');
                              }
                            }}
                          >
                            <div
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            <span className="flex-1 text-left">
                              {stage.status_name}
                            </span>
                            {opportunity.stage_id === stage.id && (
                              <Check className="text-primary h-4 w-4 shrink-0" />
                            )}
                          </button>
                        ))}
                      <div className="mt-1 border-t pt-1">
                        <button
                          type="button"
                          className="text-primary hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition-colors"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setIsManageStagesOpen(true);
                          }}
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Manage Stages
                        </button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </Tooltip>
            </TooltipProvider>
          )}

          {rbacCanAccess('opportunities', 'close_won') && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-green-600 text-green-600 hover:bg-green-50"
                    disabled={!canCloseWon}
                    onClick={async () => {
                      const wonStage = stages.find(
                        (s: any) =>
                          s.status_name.toLowerCase().includes('won') ||
                          s.is_won,
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
                        } catch {
                          toast.error('Failed to update status');
                        }
                      }
                    }}
                  >
                    <CheckCircle className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Close as Won</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close as Won</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {rbacCanAccess('opportunities', 'close_lost') && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                    disabled={!canCloseLost}
                    onClick={async () => {
                      const lostStage = stages.find(
                        (s: any) =>
                          s.status_name.toLowerCase().includes('lost') ||
                          s.is_lost,
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
                        } catch {
                          toast.error('Failed to update status');
                        }
                      }
                    }}
                  >
                    <Flag className="h-4 w-4 lg:mr-2" />
                    <span className="hidden lg:inline">Close as Lost</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Close as Lost</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {canEdit && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="gap-2"
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="hidden lg:inline">Edit Profile</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit Profile</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <PageBody className="pb-6 lg:overflow-hidden">
        <DeleteEntityDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entityId={id}
          entityType="opportunity"
          entityName={opportunity.opportunity_name}
          onSuccess={() => router.push('/home/sales/opportunities')}
        />
        <div className="flex w-full flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
          {/* Main Content */}
          <div className="w-full space-y-4 lg:w-[65%] lg:overflow-y-auto">
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
                      href={`/home/sales/accounts/${opportunity.account.id}`}
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
            />

            {/* Sales Pipeline Timeline */}
            {/* <CardWidgetContainer
              title="Opportunity Sales Pipeline"
              icon={
                <Workflow className="text-leadgaze-dark h-5 w-5 dark:text-white" />
              }
              className="w-full border shadow-sm"
            >
              <div className="px-6 pb-6 pt-4">
                <OpportunityStatusTimeline
                  opportunityId={id}
                  currentStatusId={opportunity.stage_id}
                  statuses={stages}
                  onStatusChange={refetch}
                  canEdit={canEdit}
                />
              </div>
            </CardWidgetContainer> */}

            {/* Tabs Section */}
            <Tabs
              defaultValue={canManageEmail ? 'email' : 'notes'}
              className="space-y-4"
            >
              <TabsList className="mb-2 h-auto w-full justify-start gap-3 overflow-x-auto rounded-none border-b bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden">
                {canManageEmail && (
                  <TabsTrigger
                    value="email"
                    className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </TabsTrigger>
                )}
                <TabsTrigger
                  value="notes"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger
                  value="meetings"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Meetings
                </TabsTrigger>
                <TabsTrigger
                  value="calls"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  Calls
                </TabsTrigger>
                <TabsTrigger
                  value="reminders"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Reminders
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Documents
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>

              {canManageEmail && (
                <TabsContent
                  value="email"
                  className="max-h-[500px] overflow-y-auto"
                >
                  <EntityEmails
                    entityId={id}
                    entityType="opportunity"
                    entityName={opportunity.opportunity_name}
                    recipientOptions={opportunityEmailRecipients}
                  />
                </TabsContent>
              )}

              <TabsContent
                value="notes"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityNotes entityType="opportunity" entityId={id} />
              </TabsContent>

              <TabsContent
                value="meetings"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityMeetings entityType="opportunity" entityId={id} />
              </TabsContent>

              <TabsContent
                value="calls"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityCalls entityType="opportunity" entityId={id} />
              </TabsContent>

              <TabsContent
                value="reminders"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityReminders entityType="opportunity" entityId={id} />
              </TabsContent>

              <TabsContent
                value="documents"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityDocuments entityType="opportunity" entityId={id} />
              </TabsContent>

              <TabsContent value="activity">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-900">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Opportunity Created
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(opportunity.created_at)}
                          </p>
                        </div>
                      </div>
                      {opportunity.updated_at &&
                        opportunity.updated_at !== opportunity.created_at && (
                          <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-900">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Opportunity Updated
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatDate(opportunity.updated_at)}
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Danger Zone */}
            {rbacCanAccess('opportunities', 'delete') && (
              <Card className="border-destructive/50 hidden border-solid lg:block">
                <CardContent>
                  <div className="mt-6 flex flex-col items-center justify-between md:flex-row">
                    <div className="mb-2 space-y-1">
                      <p className="font-medium dark:text-white">
                        Delete Opportunity
                      </p>
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
          <div className="w-full space-y-4 lg:w-[35%] lg:overflow-y-auto">
            {/* Accordion Sections */}
            <Accordion
              type="single"
              collapsible
              className="space-y-2"
              value={openAccordion}
              onValueChange={setOpenAccordion}
            >
              {/* Opportunity Details */}
              <AccordionItem
                value="details"
                className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="primary-heading text-leadgaze-dark flex items-center gap-2 dark:text-white">
                    <Wallet className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                    Details
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <DetailInfoList>
                    <DetailInfoRow
                      icon={<Wallet className="h-5 w-5" />}
                      label="Amount"
                      value={new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: opportunity.currency || 'USD',
                      }).format(opportunity.amount || 0)}
                    />
                    <DetailInfoRow
                      icon={<Target className="h-5 w-5" />}
                      label="Revenue"
                      value={new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: opportunity.currency || 'USD',
                      }).format(opportunity.expected_revenue || 0)}
                    />
                    <DetailInfoRow
                      icon={<Calendar className="h-5 w-5" />}
                      label="Close Date"
                      value={
                        opportunity.expected_close_date
                          ? formatDate(opportunity.expected_close_date)
                          : '-'
                      }
                    />
                    <DetailInfoRow
                      icon={<CheckCircle className="h-5 w-5" />}
                      label="Probability"
                      value={`${opportunity.probability}%`}
                    />
                    <DetailInfoRow
                      icon={<Flag className="h-5 w-5" />}
                      label="Priority"
                      value={
                        opportunity.priority
                          ? opportunity.priority.charAt(0).toUpperCase() +
                            opportunity.priority.slice(1)
                          : '-'
                      }
                    />
                    {opportunity.lead_source && (
                      <DetailInfoRow
                        icon={<Tag className="h-5 w-5" />}
                        label="Lead Source"
                        value={opportunity.lead_source}
                      />
                    )}
                    {opportunity.description && (
                      <DetailInfoRow
                        icon={<FileText className="h-5 w-5" />}
                        label="Description"
                        value={opportunity.description}
                      />
                    )}
                    {opportunity.competitor && (
                      <DetailInfoRow
                        icon={<Target className="h-5 w-5" />}
                        label="Competitor"
                        value={opportunity.competitor}
                      />
                    )}
                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>

              {/* Assigned Team Members */}
              {currentWorkspace?.id && (
                <AccordionItem
                  value="assignees"
                  className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
                >
                  <AccordionTrigger
                    hideChevron
                    className="px-4 py-3 hover:no-underline"
                  >
                    <div className="flex w-full justify-between">
                      <span className="primary-heading text-leadgaze-dark flex items-center gap-2">
                        <Users className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                        Assigned Members
                      </span>
                      <Button
                        size="sm"
                        className="mr-3 ml-2 shrink-0 gap-2"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsAssignModalOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                        Assign Member
                      </Button>
                    </div>
                    <ChevronDown
                      className={cn(
                        'text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200',
                        openAccordion === 'assignees' && 'rotate-180',
                      )}
                    />
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <OpportunityAssignees
                      opportunityId={id}
                      workspaceId={currentWorkspace.id}
                      embedded
                    />
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* System Info */}
              <AccordionItem
                value="system"
                className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="primary-heading text-leadgaze-dark flex items-center gap-2 dark:text-white">
                    <Clock className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                    System Info
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <DetailInfoList>
                    <DetailInfoRow
                      icon={<User className="h-5 w-5" />}
                      label="Owner"
                      value={opportunity.owner?.name || '-'}
                    />
                    <DetailInfoRow
                      icon={<Calendar className="h-5 w-5" />}
                      label="Created At"
                      value={formatDate(opportunity.created_at)}
                    />
                    <DetailInfoRow
                      icon={<User className="h-5 w-5" />}
                      label="Created By"
                      value={
                        opportunity.created_by_account?.name ||
                        opportunity.created_by ||
                        '-'
                      }
                    />
                    <DetailInfoRow
                      icon={<Calendar className="h-5 w-5" />}
                      label="Updated"
                      value={formatDate(opportunity.updated_at)}
                    />
                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Danger Zone */}
          <div className="w-full lg:hidden">
            {rbacCanAccess('opportunities', 'delete') && (
              <Card className="border-destructive/50 border-solid">
                <CardContent>
                  <div className="mt-6 flex flex-col items-center justify-between md:flex-row">
                    <div className="mb-2 space-y-1">
                      <p className="font-medium dark:text-white">
                        Delete Opportunity
                      </p>
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

      {canManageEmail && (
        <CoreEmailComposeDialog
          open={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          workspaceId={currentWorkspace?.id || ''}
          accounts={coreEmailAccounts}
          entityType="opportunity"
          entityId={id}
          initialTo={opportunityEmailRecipients[0]?.email}
          templateContext={{
            opportunity_name: opportunity.opportunity_name,
          }}
        />
      )}

      <CentralStatusManagementDialog
        open={isManageStagesOpen}
        onOpenChange={setIsManageStagesOpen}
        workspaceId={currentWorkspace?.id ?? ''}
        initialTab="opportunities"
      />

      {/* Page-level Assign User Modal (works from accordion header even when collapsed) */}
      {currentWorkspace?.id && (
        <AssignUserModal
          isOpen={isAssignModalOpen}
          onOpenChange={setIsAssignModalOpen}
          leadId={id}
          workspaceId={currentWorkspace.id}
          currentAssignees={
            pageAssignees as Parameters<
              typeof AssignUserModal
            >[0]['currentAssignees']
          }
          onAssign={(userId) => pageAssignMutation.mutate(userId)}
          isLoading={pageAssignMutation.isPending}
        />
      )}
    </ModuleGuard>
  );
}
