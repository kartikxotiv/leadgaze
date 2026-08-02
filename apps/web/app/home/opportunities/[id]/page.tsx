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
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';

import { CoreEmailComposeDialog } from '@kit/core/pages';
import { getCoreEmailAccountsService } from '@kit/core/services';
import {
  convertFromUSD,
  findLatestRateToUsd,
  formatWorkspaceCurrency,
} from '@kit/shared/currency';
import type { ExchangeRateRecord } from '@kit/shared/currency';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
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
import { InlineEditableValue } from '@kit/ui/inline-editable-value';
import { Input } from '@kit/ui/input';
import { PageBody } from '@kit/ui/page';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Skeleton } from '@kit/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { cn } from '@kit/ui/utils';

import { useDynamicColumns } from '~/lib/hooks/use-dynamic-columns';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import { useLocalization } from '~/lib/localization/localization-provider';
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
import { EntityTasks } from '../../_components/entity-tasks';
import { ManageableStatusSelect } from '../../_components/manageable-status-select';
import { AssignUserModal } from '../../leads/components/assign-user-modal';
import { LogCallDialog } from '../../leads/components/log-call-dialog';
import { EditOpportunityDialog } from '../components/edit-opportunity-dialog';
import { OpportunityAssignees } from '../components/opportunity-assignees';

function OpportunityDetailsSkeleton() {
  return (
    <ModuleGuard module="opportunities">
      <div className="flex h-full flex-col">
        <div className="px-6 pb-2 pt-4">
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
  const { formatDate, formatCurrency } = useLocalization();
  const supabase = useSupabase();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLogCallDialogOpen, setIsLogCallDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>('');
  const [isManageStagesOpen, setIsManageStagesOpen] = useState(false);
  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isEditingCloseDate, setIsEditingCloseDate] = useState(false);
  const [isEditingProbability, setIsEditingProbability] = useState(false);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);

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

  const opportunityUpdateMutation = useMutation({
    mutationFn: async (params: {
      field: string;
      value: any;
    }) => {
      if (!opportunity) {
        throw new Error('Opportunity is not available for updates');
      }

      const payload = {
        opportunity_name: opportunity.opportunity_name,
        amount: opportunity.amount,
        currency: opportunity.currency,
        probability: opportunity.probability,
        expected_close_date: opportunity.expected_close_date,
        priority: opportunity.priority,
        opportunity_type: opportunity.opportunity_type,
        lead_source: opportunity.lead_source,
        description: opportunity.description,
        competitor: opportunity.competitor,
        is_closed: opportunity.is_closed,
        is_won: opportunity.is_won,
        close_reason: opportunity.close_reason,
        stage_id: opportunity.stage_id,
        owner_id: opportunity.owner_id,
        custom_fields: opportunity.custom_fields,
      };

      payload[params.field as keyof typeof payload] = params.value;

      return updateOpportunityService(id, payload);
    },
    onSuccess: async () => {
      toast.success('Opportunity updated successfully');
      await refetch();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update opportunity';
      toast.error(message);
    },
  });

  const commitOpportunityField = async (
    field: string,
    value: any,
  ) => {
    await opportunityUpdateMutation.mutateAsync({
      field,
      value: typeof value === 'string' ? value.trim() || null : value,
    });
  };

  useEffect(() => {
    if (opportunity) {
      console.log('[DEBUG] Opportunity:', opportunity);
    }
  }, [opportunity]);

  const { currentWorkspace, canAccess: rbacCanAccess } = useRBAC();
  const canManageEmail = rbacCanAccess('emails', 'manage_email');
  const { data: user } = useUser();
  const { canView } = useFieldPermissions({
    entityType: 'opportunities',
    workspaceId: currentWorkspace?.id,
    enabled: !!currentWorkspace?.id,
  });

  const { fields = [] } = useDynamicColumns({
    entityType: 'opportunities',
    workspaceId: currentWorkspace?.id,
    userId: user?.id,
    enabled: !!currentWorkspace?.id,
  });

  // Fetch workspace currencies for currency conversion
  const { data: currenciesData } = useQuery({
    queryKey: ['workspace-currencies', currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .schema('core')
        .from('workspace_currencies')
        .select('id, currency_code, is_default')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('currency_code', { ascending: true });
      if (error) {
        console.error('Failed to fetch workspace currencies:', error);
        return [];
      }
      return data;
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch exchange rates for currency conversion
  const exchangeRates = currentWorkspace?.localization?.exchange_rates || [];

  const customFieldsToShow = useMemo(() => {
    if (!opportunity) return [];
    const oppCustom =
      (opportunity.custom_fields as Record<string, unknown>) || {};
    return fields.filter(
      (f) =>
        !f.is_system &&
        canView(f.field_key) &&
        oppCustom[f.field_key] !== undefined &&
        oppCustom[f.field_key] !== null &&
        oppCustom[f.field_key] !== '',
    );
  }, [fields, canView, opportunity]);

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
    queryFn: () => getOpportunityStatusesService({ workspaceId: currentWorkspace!.id }),
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
      <div className="flex flex-wrap items-start gap-2 pb-2 pt-4 sm:flex-nowrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="border-leadgaze-border border p-0"
          >
            <Link href="/home/sales/opportunities">
              <ArrowLeft className="ml-2 mr-2 h-4 w-4" />
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
                      Created by{' '}
                      {opportunity.created_by_account?.name || 'Unknown'} on{' '}
                      {formatDate(opportunity.created_at)}
                    </span>
                  </div>
                  {opportunity.updated_by && (
                    <>
                      <div className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block dark:bg-gray-600" />
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          Updated by{' '}
                          {opportunity.updated_by_account?.name || 'Unknown'} on{' '}
                          {formatDate(opportunity.updated_at)}
                        </span>
                      </div>
                    </>
                  )}
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
                  value="tasks"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Tasks
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

              <TabsContent
                value="tasks"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityTasks entityType="opportunity" entityId={id} />
              </TabsContent>

              <TabsContent value="activity">
                <CardWidgetContainer
                  title="Activity"
                  hideHeaderBorder={true}
                  icon={
                    <Clock className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                  }
                >
                  <CardContent className="px-6 py-3">
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
                </CardWidgetContainer>
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
                    {canView('amount') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Wallet className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Amount
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          {isEditingAmount ? (
                            <Input
                              type="number"
                              step="0.01"
                              className="ml-auto w-[220px] text-right"
                              defaultValue={opportunity.amount || ''}
                              disabled={!canEdit}
                              onBlur={async (e) => {
                                const val = e.target.value.trim() ? parseFloat(e.target.value) : null;
                                await commitOpportunityField('amount', val);
                                setIsEditingAmount(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setIsEditingAmount(false);
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setIsEditingAmount(true)}
                              className={cn(
                                'group inline-flex w-full items-center justify-end rounded-[4px] text-right outline-none transition-colors',
                                {
                                  'cursor-text': canEdit,
                                  'hover:bg-accent/20': canEdit,
                                },
                              )}
                            >
                              <span className="block w-full rounded-[4px] px-0 py-0 text-right text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
                                {(() => {
                                  const workspaceCurrency =
                                    currenciesData?.find((c) => c.is_default)
                                      ?.currency_code || 'USD';
                                  if (
                                    opportunity.base_amount_usd !== null &&
                                    opportunity.base_amount_usd !== undefined
                                  ) {
                                    const rate =
                                      findLatestRateToUsd(
                                        exchangeRates as ExchangeRateRecord[],
                                        workspaceCurrency,
                                      )?.exchange_rate || 1;
                                    const convertedAmount = convertFromUSD(
                                      opportunity.base_amount_usd,
                                      rate,
                                    );
                                    return formatWorkspaceCurrency(
                                      convertedAmount,
                                      workspaceCurrency,
                                    );
                                  }
                                  if (
                                    opportunity.amount_original !== null &&
                                    opportunity.amount_original !== undefined
                                  ) {
                                    const currency =
                                      opportunity.currency_original ||
                                      opportunity.currency ||
                                      'USD';
                                    return formatWorkspaceCurrency(
                                      opportunity.amount_original,
                                      currency,
                                    );
                                  }
                                  return formatWorkspaceCurrency(
                                    opportunity.amount || 0,
                                    opportunity.currency || 'USD',
                                  );
                                })()}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {canView('expected_close_date') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Calendar className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Close Date
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          {isEditingCloseDate ? (
                            <Input
                              type="date"
                              className="ml-auto w-[220px] text-right"
                              defaultValue={opportunity.expected_close_date ? new Date(opportunity.expected_close_date).toISOString().split('T')[0] : ''}
                              disabled={!canEdit}
                              onBlur={async (e) => {
                                await commitOpportunityField('expected_close_date', e.target.value || null);
                                setIsEditingCloseDate(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setIsEditingCloseDate(false);
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setIsEditingCloseDate(true)}
                              className={cn(
                                'group inline-flex w-full items-center justify-end rounded-[4px] text-right outline-none transition-colors',
                                {
                                  'cursor-text': canEdit,
                                  'hover:bg-accent/20': canEdit,
                                },
                              )}
                            >
                              <span className="block w-full rounded-[4px] px-0 py-0 text-right text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
                                {opportunity.expected_close_date
                                  ? formatDate(opportunity.expected_close_date)
                                  : '-'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {canView('probability') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Probability
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          {isEditingProbability ? (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              className="ml-auto w-[220px] text-right"
                              defaultValue={opportunity.probability ?? ''}
                              disabled={!canEdit}
                              onBlur={async (e) => {
                                const val = e.target.value.trim() ? parseInt(e.target.value) : null;
                                await commitOpportunityField('probability', val);
                                setIsEditingProbability(false);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.currentTarget.blur();
                                } else if (e.key === 'Escape') {
                                  setIsEditingProbability(false);
                                }
                              }}
                              autoFocus
                            />
                          ) : (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setIsEditingProbability(true)}
                              className={cn(
                                'group inline-flex w-full items-center justify-end rounded-[4px] text-right outline-none transition-colors',
                                {
                                  'cursor-text': canEdit,
                                  'hover:bg-accent/20': canEdit,
                                },
                              )}
                            >
                              <span className="block w-full rounded-[4px] px-0 py-0 text-right text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
                                {opportunity.probability !== null && opportunity.probability !== undefined
                                  ? `${opportunity.probability}%`
                                  : '-'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {canView('priority') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Flag className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Priority
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          {isEditingPriority ? (
                            <div className="ml-auto w-[220px]">
                              <Select
                                value={opportunity.priority || ''}
                                onValueChange={async (value) => {
                                  await commitOpportunityField('priority', value || null);
                                  setIsEditingPriority(false);
                                }}
                                open={isEditingPriority}
                                onOpenChange={(open) => {
                                  if (!open) setIsEditingPriority(false);
                                }}
                                disabled={!canEdit}
                              >
                                <SelectTrigger className="text-right justify-end">
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                  <SelectItem value="High">High</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="Low">Low</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setIsEditingPriority(true)}
                              className={cn(
                                'group inline-flex w-full items-center justify-end rounded-[4px] text-right outline-none transition-colors',
                                {
                                  'cursor-text': canEdit,
                                  'text-muted-foreground': !opportunity.priority,
                                  'hover:bg-accent/20': canEdit,
                                },
                              )}
                            >
                              <span className="block w-full rounded-[4px] px-0 py-0 text-right text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
                                {opportunity.priority
                                  ? opportunity.priority.charAt(0).toUpperCase() + opportunity.priority.slice(1)
                                  : '-'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {canView('opportunity_type') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Tag className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Type
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          {isEditingType ? (
                            <div className="ml-auto w-[220px]">
                              <Select
                                value={opportunity.opportunity_type || ''}
                                onValueChange={async (value) => {
                                  await commitOpportunityField('opportunity_type', value || null);
                                  setIsEditingType(false);
                                }}
                                open={isEditingType}
                                onOpenChange={(open) => {
                                  if (!open) setIsEditingType(false);
                                }}
                                disabled={!canEdit}
                              >
                                <SelectTrigger className="text-right justify-end">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                  <SelectItem value="New Business">New Business</SelectItem>
                                  <SelectItem value="Existing Business">Existing Business</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => setIsEditingType(true)}
                              className={cn(
                                'group inline-flex w-full items-center justify-end rounded-[4px] text-right outline-none transition-colors',
                                {
                                  'cursor-text': canEdit,
                                  'text-muted-foreground': !opportunity.opportunity_type,
                                  'hover:bg-accent/20': canEdit,
                                },
                              )}
                            >
                              <span className="block w-full rounded-[4px] px-0 py-0 text-right text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
                                {opportunity.opportunity_type || '-'}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {canView('lead_source') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Tag className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Lead Source
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={opportunity.lead_source || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-gray-900 dark:text-white"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitOpportunityField('lead_source', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('description') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Description
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={opportunity.description || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-gray-900 dark:text-white"
                            inputClassName="text-right"
                            multiline
                            onCommit={async (nextValue) => {
                              await commitOpportunityField('description', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('competitor') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Target className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Competitor
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={opportunity.competitor || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-gray-900 dark:text-white"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitOpportunityField('competitor', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>

              {/* Additional Data (Custom Fields) */}
              {customFieldsToShow.length > 0 && (
                <AccordionItem
                  value="additional"
                  className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <span className="primary-heading text-leadgaze-dark flex items-center gap-2">
                      <FileText className="text-leadgaze-dark h-4 w-4 dark:text-white" />
                      Additional Data
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <DetailInfoList>
                      {customFieldsToShow.map((field) => {
                        const val = (
                          opportunity.custom_fields as Record<string, unknown>
                        )?.[field.field_key];
                        return (
                          <DetailInfoRow
                            key={field.id}
                            label={field.field_label}
                            value={
                              val === true
                                ? 'Yes'
                                : val === false
                                  ? 'No'
                                  : String(val ?? '-')
                            }
                          />
                        );
                      })}
                    </DetailInfoList>
                  </AccordionContent>
                </AccordionItem>
              )}

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
                        className="ml-2 mr-3 shrink-0 gap-2"
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
                      value={
                        opportunity.created_at
                          ? formatDate(opportunity.created_at)
                          : '-'
                      }
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
                      value={
                        opportunity.updated_at
                          ? formatDate(opportunity.updated_at)
                          : '-'
                      }
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
