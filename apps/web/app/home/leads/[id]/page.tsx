'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  Clock,
  Download,
  Edit2,
  Factory,
  FileStack,
  FileText,
  Flag,
  Globe,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Trash2,
  User,
  Users,
  CheckSquare,
} from 'lucide-react';
import { toast } from 'sonner';

import { CoreEmailComposeDialog } from '@kit/core/pages';
import { getCoreEmailAccountsService } from '@kit/core/services';
import { useLocalization } from '~/lib/localization/localization-provider';
import { useUser } from '@kit/supabase/hooks/use-user';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@kit/ui/accordion';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { DetailHeader } from '@kit/ui/detail-header';
import { DetailInfoList, DetailInfoRow } from '@kit/ui/detail-info-row';
import { InlineEditableValue } from '@kit/ui/inline-editable-value';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { cn } from '@kit/ui/utils';

import { calculateLeadScore } from '~/lib/lead-scoring/lead-scoring-engine';
import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import { useDynamicColumns } from '~/lib/hooks/use-dynamic-columns';
import {
  assignLeadToUser,
  getLeadAssignees,
} from '~/services/lead-assignees.service';
import {
  getLeadByIdService,
  getLeadStatusesService,
  updateLeadService,
} from '~/services/leads.service';
import { getIndustriesService } from '~/services/industries.service';

import { EntityActivityLogs } from '../../_components/entity-activity-logs';
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
import { AssignUserModal } from '../components/assign-user-modal';
import { ChangeStatusDialog } from '../components/change-status-dialog';
import { ConvertLeadDialog } from '../components/convert-lead-dialog';
import EditLeadDialog from '../components/edit-lead-dialog';
import { LeadAssignees } from '../components/lead-assignees';
import { LogCallDialog } from '../components/log-call-dialog';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';

const COMPANY_SIZE_OPTIONS = [
  { value: 'startup', label: 'Startup (1-10)' },
  { value: 'small', label: 'Small (11-50)' },
  { value: 'medium', label: 'Medium (51-500)' },
  { value: 'large', label: 'Large (501-5000)' },
  { value: 'enterprise', label: 'Enterprise (5000+)' },
];

type LeadInlineEditableField =
  | 'company_name'
  | 'company_website'
  | 'email'
  | 'alt_email'
  | 'phone_number'
  | 'mobile_number'
  | 'location'
  | 'timezone'
  | 'linkedin_url';

function LeadDetailsSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-4 pb-2">
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <DetailHeader
              avatar={<Skeleton className="h-16 w-16 rounded-full" />}
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
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                {[...Array(8)].map((_, i) => (
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
                {[...Array(4)].map((_, i) => (
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
  );
}

export default function LeadDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const { formatDate } = useLocalization();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isLogCallDialogOpen, setIsLogCallDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>('');
  const [isEditingCompanySize, setIsEditingCompanySize] = useState(false);

  const queryClient = useQueryClient();

  const leadId = params?.id as string;
  const canManageEmail = canAccess('emails', 'manage_email');

  // Page-level assign modal (works even when accordion is collapsed)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const { data: pageAssignees = [] } = useQuery({
    queryKey: ['lead-assignees', leadId],
    queryFn: async () => {
      const res = await getLeadAssignees(leadId);
      return res?.data ?? [];
    },
    enabled: !!leadId,
  });
  const pageAssignMutation = useMutation({
    mutationFn: (userId: string) =>
      assignLeadToUser(leadId, { assigned_to_user_id: userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-assignees', leadId] });
      toast.success('User assigned to lead');
      setIsAssignModalOpen(false);
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'Failed to assign user';
      toast.error(message);
    },
  });

  const {
    data: lead,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => {
      if (!leadId) throw new Error('Lead ID is required');
      return getLeadByIdService(leadId);
    },
    enabled: !!leadId && !!workspace,
  });
  const { data: coreEmailAccounts = [] } = useQuery({
    queryKey: ['core-email-accounts', workspace?.id],
    queryFn: () => getCoreEmailAccountsService(workspace!.id),
    enabled: canManageEmail && !!workspace?.id,
  });

  const { data: industries = [] } = useQuery({
    queryKey: ['industries', workspace?.id],
    queryFn: () => getIndustriesService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const { data: user } = useUser();
  const editPermission = usePermissionDetail('leads', 'edit');
  const canEdit = useCanAccessData(editPermission, lead?.owner_id, user?.id);

  const convertPermission = usePermissionDetail('leads', 'convert');
  const canConvert = useCanAccessData(
    convertPermission,
    lead?.owner_id,
    user?.id,
  );

  const { data: statuses = [], isLoading: statusesLoading } = useQuery({
    queryKey: ['lead-statuses', workspace?.id],
    queryFn: () => {
      if (!workspace?.id) return Promise.resolve([]);
      return getLeadStatusesService({ workspaceId: workspace.id });
    },
    enabled: !!workspace?.id,
  });

  const scoringResult = useMemo(() => {
    if (!lead) return null;
    return calculateLeadScore({
      first_name: lead.first_name,
      last_name: lead.last_name,
      company_name: lead.company_name,
      industry_id: lead.industry_id || lead.industry?.id,
      company_size: lead.company_size,
      location: lead.location,
      timezone: lead.timezone,
      job_title: lead.job_title,
      status_key: lead.status?.status_key,
      contacted_count: lead.contacted_count,
      custom_fields: lead.custom_fields || {},
      source_id: lead.source_id,
    });
  }, [lead]);

  const { canView } = useFieldPermissions({
    entityType: 'leads',
    workspaceId: workspace?.id,
    enabled: !!workspace?.id,
  });

  const { fields = [] } = useDynamicColumns({
    entityType: 'leads',
    workspaceId: workspace?.id,
    userId: user?.id,
    enabled: !!workspace?.id,
  });

  const customFieldsToShow = useMemo(() => {
    if (!lead) return [];
    const leadCustom = (lead.custom_fields as Record<string, unknown>) || {};
    return fields.filter(
      (f) =>
        !f.is_system &&
        canView(f.field_key) &&
        leadCustom[f.field_key] !== undefined &&
        leadCustom[f.field_key] !== null &&
        leadCustom[f.field_key] !== '',
    );
  }, [fields, canView, lead]);

  const leadUpdateMutation = useMutation({
    mutationFn: async (params: {
      field: LeadInlineEditableField | 'industry' | 'company_size';
      value: string | null;
    }) => {
      if (!lead) {
        throw new Error('Lead is not available for updates');
      }

      const payload: Record<string, any> = {
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email,
        alt_email: lead.alt_email,
        phone_number: lead.phone_number,
        mobile_number: lead.mobile_number,
        linkedin_url: lead.linkedin_url,
        company_name: lead.company_name,
        company_website: lead.company_website,
        company_linkedin_url: lead.company_linkedin_url,
        job_title: lead.job_title,
        department: lead.department,
        industry_id: lead.industry_id ?? lead.industry?.id,
        company_size: lead.company_size,
        annual_revenue: lead.annual_revenue,
        location: lead.location,
        timezone: lead.timezone,
        status_id: lead.status_id,
        source_id: lead.source_id,
        trigger: lead.trigger,
        lead_score: lead.lead_score,
        owner_id: lead.owner_id,
        notes: lead.notes,
        tags: lead.tags,
        custom_fields: lead.custom_fields,
      };

      payload[params.field] = params.value;
      if (params.field === 'industry') {
        const matchingIndustry = industries.find(
          (industry: { id: string; industry_name: string }) =>
            industry.industry_name.toLowerCase() ===
            (params.value || '').toLowerCase(),
        );

        payload.industry_id = matchingIndustry?.id || null;
        delete payload.industry;
      }

      return updateLeadService(leadId, payload);
    },
    onSuccess: async () => {
      toast.success('Lead updated successfully');
      await refetch();
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : 'Failed to update lead';
      toast.error(message);
    },
  });

  const commitLeadField = async (
    field: LeadInlineEditableField | 'industry' | 'company_size',
    value: string,
  ) => {
    await leadUpdateMutation.mutateAsync({
      field,
      value: value.trim() || null,
    });
  };
  const currentStatus = useMemo(() => {
    if (!lead) return null;
    return (
      lead.status ||
      statuses.find(
        (s: any) => s.id === lead.status_id || s.id === lead.status?.id,
      )
    );
  }, [lead, statuses]);

  if (!workspace) {
    // Workspace context still hydrating; show skeleton, same as isLoading.
    return (
      <ModuleGuard module="leads">
        <LeadDetailsSkeleton />
      </ModuleGuard>
    );
  }

  const handleStatusChange = async (newStatusId: string) => {
    setIsSaving(true);
    try {
      await updateLeadService(leadId, { status_id: newStatusId });
      toast.success('Lead status updated successfully');
      setStatusModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
      await refetch();
    } catch (err: any) {
      console.error('Status update error:', err);
      toast.error(err.message || 'Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertLead = () => {
    setIsConvertDialogOpen(true);
  };

  const handleConvertSuccess = () => {
    refetch(); // usage of refetch() implies we stay on page, but converted lead might be locked or different view?
    // For now, refreshing data is fine.
  };

  if (isLoading) {
    return (
      <ModuleGuard module="leads">
        <LeadDetailsSkeleton />
      </ModuleGuard>
    );
  }

  if (error || !lead) {
    return (
      <ModuleGuard module="leads">
        <PageHeader title="Lead Details" />
        <PageBody>
          <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
            <CardContent className="pt-6">
              <p className="text-red-700 dark:text-red-300">
                {error?.message || 'Lead not found'}
              </p>
            </CardContent>
          </Card>
        </PageBody>
      </ModuleGuard>
    );
  }

  const fullName = `${lead.first_name}${lead.last_name ? ` ${lead.last_name}` : ''}`;
  const statusColor = currentStatus?.color || lead.status?.color || '#3B82F6';
  const sourceColor = lead.source?.color || '#6B7280';

  const EditableField = ({
    label,
    value,
    fieldName,
  }: {
    label: string;
    value: string | null;
    fieldName: string;
  }) => (
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
          {label}
        </p>
        <p className="mt-1 text-sm text-gray-900 dark:text-white">
          {value || '-'}
        </p>
      </div>
    </div>
  );

  return (
    <ModuleGuard module="leads">
      <div className="flex flex-wrap items-start gap-2 pt-4 pb-2 sm:flex-nowrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="border-leadgaze-border border p-0"
          >
            <Link href="/home/sales/leads">
              <ArrowLeft className="mr-2 ml-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-leadgaze-dark text-lg font-bold dark:text-white">
              Lead details
            </h1>
            <p className="text-leadgaze-muted text-sm">
              View and edit lead information
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
                    onClick={() => setStatusModalOpen(true)}
                    className="gap-2"
                    disabled={isSaving}
                  >
                    <Flag
                      className="h-4 w-4 shrink-0 transition-colors"
                      style={{ color: statusColor, fill: statusColor }}
                    />
                    <span className="hidden sm:inline">Change Status</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">
                  Change Status
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

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
                    <span className="hidden sm:inline">Log Call</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">Log Call</TooltipContent>
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
                    className={`gap-2 ${!lead.email ? 'opacity-50' : ''}`}
                    disabled={!lead.email}
                    onClick={() => lead.email && setIsEmailDialogOpen(true)}
                    title={
                      !lead.email
                        ? 'Lead has no email address'
                        : 'Send email to lead'
                    }
                  >
                    <Mail className="h-4 w-4" />
                    <span className="hidden sm:inline">Send Email</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">
                  {!lead.email ? 'Lead has no email' : 'Send Email'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {!lead.is_converted_to_account && canConvert && (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleConvertLead}
                    className="gap-2"
                    disabled={isSaving}
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Convert Lead</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden">
                  Convert Lead
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {canEdit && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsEditDialogOpen(true)}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              <span className="hidden sm:inline">Edit Profile</span>
            </Button>
          )}
        </div>
      </div>

      <PageBody className="pb-6 lg:overflow-hidden">
        <DeleteEntityDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entityId={leadId}
          entityType="lead"
          entityName={`${lead.first_name} ${lead.last_name || ''}`}
          onSuccess={() => router.push('/home/sales/leads')}
        />
        <div className="flex w-full flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
          {/* Main Content */}
          <div className="w-full space-y-4 lg:w-[65%] lg:overflow-y-auto">
            <DetailHeader
              avatar={
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-lg font-semibold text-white">
                  {lead.first_name?.charAt(0)}
                  {lead.last_name?.charAt(0)}
                </div>
              }
              title={fullName}
              subtitle={
                <>
                  {lead.job_title && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      {lead.job_title}
                    </span>
                  )}
                  {lead.company_name && (
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {lead.company_name}
                    </span>
                  )}
                  <div className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block dark:bg-gray-600" />
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>
                      Created by {lead.created_by_account?.name || 'Unknown'} on {formatDate(lead.created_at)}
                    </span>
                  </div>
                  {lead.updated_by && (
                    <>
                      <div className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block dark:bg-gray-600" />
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>
                          Updated by {lead.updated_by_account?.name || 'Unknown'} on {formatDate(lead.updated_at)}
                        </span>
                      </div>
                    </>
                  )}
                </>
              }
              email={lead.email || undefined}
              right={
                lead.lead_score !== null ? (
                  <div className="mx-auto flex flex-col items-center gap-1 lg:mx-0">
                    <span className="primary-text-medium text-leadgaze-dark dark:text-white">
                      Lead Score
                    </span>

                    <div className="relative h-15 w-15 shrink-0">
                      <svg
                        className="h-full w-full -rotate-90 transform"
                        viewBox="0 0 100 100"
                      >
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke={statusColor}
                          strokeWidth="3"
                          strokeDasharray={`${((scoringResult?.totalScore ?? lead.lead_score) / 100) * 283} 283`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="primary-heading text-gray-900 dark:text-white">
                          {scoringResult?.totalScore ?? lead.lead_score}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : undefined
              }
            />
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
                    entityId={leadId}
                    entityType="lead"
                    entityName={fullName}
                    entityEmail={lead.email || undefined}
                  />
                </TabsContent>
              )}

              <TabsContent
                value="notes"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityNotes entityType="lead" entityId={leadId} />
              </TabsContent>

              <TabsContent
                value="meetings"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityMeetings entityType="lead" entityId={leadId} />
              </TabsContent>

              <TabsContent
                value="calls"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityCalls entityType="lead" entityId={leadId} />
              </TabsContent>

              <TabsContent
                value="reminders"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityReminders entityType="lead" entityId={leadId} />
              </TabsContent>

              <TabsContent
                value="documents"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityDocuments entityType="lead" entityId={leadId} />
              </TabsContent>

              <TabsContent
                value="tasks"
                className="max-h-[500px] overflow-y-auto"
              >
                <EntityTasks entityType="lead" entityId={leadId} />
              </TabsContent>

              <TabsContent value="activity">
                <EntityActivityLogs entityType="lead" entityId={leadId} />
              </TabsContent>
            </Tabs>

            {/* Danger Zone */}
            {canAccess('leads', 'delete') && (
              <Card className="border-destructive/50 hidden border-solid lg:block">
                <CardContent>
                  <div className="mt-6 flex flex-col items-center justify-between md:flex-row">
                    <div className="mb-2 space-y-1">
                      <p className="font-medium dark:text-white">Delete Lead</p>
                      <p className="text-muted-foreground text-sm">
                        Once you delete a lead, there is no going back. Please
                        be certain.
                      </p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="destructive"
                              disabled={!canAccess('leads', 'delete')}
                              onClick={() => setDeleteDialogOpen(true)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Lead
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!canAccess('leads', 'delete') && (
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
              {/* Company */}
              <AccordionItem
                value="company"
                className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="primary-heading text-leadgaze-dark flex items-center gap-2 dark:text-white">
                    <Building2 className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                    Company Details
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <DetailInfoList>
                    <div className="flex items-center justify-between gap-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="text-muted-foreground h-5 w-5 shrink-0" />
                        <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                          Company Name
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 text-right">
                        <InlineEditableValue
                          value={lead.company_name || ''}
                          disabled={!canEdit}
                          placeholder="-"
                          className="justify-end"
                          displayClassName="truncate text-sm text-gray-900 dark:text-white"
                          inputClassName="text-right"
                          onCommit={async (nextValue) => {
                            await commitLeadField('company_name', nextValue);
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <Factory className="text-muted-foreground h-5 w-5 shrink-0" />
                        <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                          Industry
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 text-right">
                        <InlineEditableValue
                          value={lead?.industry?.industry_name ?? ''}
                          disabled={!canEdit}
                          placeholder="-"
                          className="justify-end"
                          displayClassName="truncate text-sm text-gray-900 dark:text-white"
                          inputClassName="text-right"
                          onCommit={async (nextValue) => {
                            await commitLeadField('industry', nextValue);
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <Users className="text-muted-foreground h-5 w-5 shrink-0" />
                        <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                          Company Size
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 text-right">
                        {isEditingCompanySize ? (
                          <Select
                            value={lead.company_size || ''}
                            onValueChange={async (value) => {
                              await commitLeadField(
                                'company_size',
                                value === '__clear__' ? '' : value,
                              );
                              setIsEditingCompanySize(false);
                            }}
                            open={isEditingCompanySize}
                            onOpenChange={(open) => {
                              if (!open) setIsEditingCompanySize(false);
                            }}
                            disabled={!canEdit}
                          >
                            <SelectTrigger className="ml-auto w-[220px] justify-end text-right">
                              <SelectValue placeholder="Select company size" />
                            </SelectTrigger>
                            <SelectContent align="end">
                              {COMPANY_SIZE_OPTIONS.map((size) => (
                                <SelectItem key={size.value} value={size.value}>
                                  {size.label}
                                </SelectItem>
                              ))}
                              <SelectItem value="__clear__">Clear selection</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => setIsEditingCompanySize(true)}
                            className={cn(
                              'group inline-flex w-full items-center justify-end rounded-[4px] text-right outline-none transition-colors',
                              {
                                'cursor-text': canEdit,
                                'text-muted-foreground': !lead.company_size,
                                'hover:bg-accent/20': canEdit,
                              },
                            )}
                          >
                            <span className="block w-full rounded-[4px] px-0 py-0 text-right text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
                              {COMPANY_SIZE_OPTIONS.find((size) => size.value === lead.company_size)?.label || '-'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <Globe className="text-muted-foreground h-5 w-5 shrink-0" />
                        <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                          Website
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 text-right">
                        <InlineEditableValue
                          value={lead.company_website || ''}
                          disabled={!canEdit}
                          placeholder="-"
                          className="justify-end"
                          displayClassName="truncate text-sm text-blue-600 dark:text-blue-400"
                          inputClassName="text-right"
                          onCommit={async (nextValue) => {
                            await commitLeadField('company_website', nextValue);
                          }}
                        />
                      </div>
                    </div>
                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>

              {/* Contact */}
              <AccordionItem
                value="contact"
                className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <span className="primary-heading text-leadgaze-dark flex items-center gap-2">
                    <User className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                    Contact Details
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <DetailInfoList>
                    {canView('email') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Email
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={lead.email || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-blue-600 dark:text-blue-400"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitLeadField('email', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('alt_email') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Alt Email
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={lead.alt_email || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-blue-600 dark:text-blue-400"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitLeadField('alt_email', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('phone') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Phone
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={lead.phone_number || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-gray-900 dark:text-white"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitLeadField('phone_number', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('mobile') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Mobile
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={lead.mobile_number || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-gray-900 dark:text-white"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitLeadField('mobile_number', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('location') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <MapPin className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Location
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={lead.location || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-gray-900 dark:text-white"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitLeadField('location', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('timezone') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Clock className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            Timezone
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={lead.timezone || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-gray-900 dark:text-white"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitLeadField('timezone', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {canView('linkedin') && (
                      <div className="flex items-center justify-between gap-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <Linkedin className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                            LinkedIn
                          </span>
                        </div>

                        <div className="min-w-0 flex-1 text-right">
                          <InlineEditableValue
                            value={lead.linkedin_url || ''}
                            disabled={!canEdit}
                            placeholder="-"
                            className="justify-end"
                            displayClassName="truncate text-sm text-blue-600 dark:text-blue-400"
                            inputClassName="text-right"
                            onCommit={async (nextValue) => {
                              await commitLeadField('linkedin_url', nextValue);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </DetailInfoList>
                </AccordionContent>
              </AccordionItem>

              {/* Assigned Team Members */}
              {workspace?.id && (
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
                    <LeadAssignees
                      leadId={leadId}
                      workspaceId={workspace.id}
                      embedded
                    />
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Lead Owner */}
              {lead.owner && (
                <AccordionItem
                  value="owner"
                  className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <span className="primary-heading text-leadgaze-dark flex items-center gap-2">
                      <User className="text-leadgaze-dark h-4 w-4 dark:text-white" />
                      Lead Owner
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-semibold text-white">
                        {lead.owner.name?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {lead.owner.name}
                        </p>
                        <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                          {lead.owner.email}
                        </p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

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
                        const val = (lead.custom_fields as Record<string, unknown>)?.[field.field_key];
                        return (
                          <DetailInfoRow
                            key={field.id}
                            label={field.field_label}
                            value={val === true ? 'Yes' : val === false ? 'No' : String(val ?? '-')}
                          />
                        );
                      })}
                    </DetailInfoList>
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Details / Metadata */}
              {/* <AccordionItem value="details" className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900">
                <AccordionTrigger className="hover:no-underline px-4 py-3">
                  <span className="primary-heading text-leadgaze-dark flex items-center gap-2">
                    <Clock className="text-leadgaze-dark h-4 w-4 dark:text-white" />
                    Details
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                        Created
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(lead.created_at)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                        Last Updated
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(lead.updated_at)}
                      </p>
                    </div>
                    {lead.lead_score !== null && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                          Lead Score
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {scoringResult?.totalScore ?? lead.lead_score}/100
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem> */}
            </Accordion>
          </div>

          {/* Danger Zone */}
          <div className="w-full lg:hidden">
            {canAccess('leads', 'delete') && (
              <Card className="border-destructive/50 border-solid">
                <CardContent>
                  <div className="mt-6 flex flex-col items-center justify-between md:flex-row">
                    <div className="mb-2 space-y-1">
                      <p className="font-medium dark:text-white">Delete Lead</p>
                      <p className="text-muted-foreground text-sm">
                        Once you delete a lead, there is no going back. Please
                        be certain.
                      </p>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              variant="destructive"
                              disabled={!canAccess('leads', 'delete')}
                              onClick={() => setDeleteDialogOpen(true)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Lead
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {!canAccess('leads', 'delete') && (
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

      {/* Convert Lead Dialog */}
      {lead && (
        <ConvertLeadDialog
          leadId={leadId}
          leadData={{
            first_name: lead.first_name,
            last_name: lead.last_name,
            company_name: lead.company_name,
          }}
          statuses={statuses}
          open={isConvertDialogOpen}
          onOpenChange={setIsConvertDialogOpen}
          onSuccess={handleConvertSuccess}
        />
      )}

      {/* Edit Dialog */}
      <EditLeadDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={() => {
          refetch();
          setIsEditDialogOpen(false);
        }}
        lead={lead}
      />

      {/* Change Status Dialog */}
      {lead && (
        <ChangeStatusDialog
          open={statusModalOpen}
          onOpenChange={setStatusModalOpen}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
            queryClient.invalidateQueries({ queryKey: ['leads'] });
            queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
            refetch();
          }}
          lead={lead}
          statuses={statuses}
        />
      )}

      {/* Log Call Dialog */}
      {lead && workspace?.id && (
        <LogCallDialog
          open={isLogCallDialogOpen}
          onOpenChange={setIsLogCallDialogOpen}
          onSuccess={async () => {
            setIsLogCallDialogOpen(false);
            await queryClient.invalidateQueries({
              queryKey: ['calls', workspace?.id, 'lead', leadId],
            });
          }}
          entityType="lead"
          entityId={leadId}
          workspaceId={workspace.id}
          defaultContactName={`${lead.first_name}${lead.last_name ? ` ${lead.last_name}` : ''}`.trim()}
          defaultPhoneNumber={lead.phone_number || lead.mobile_number}
        />
      )}
      {/* Email Compose Dialog */}
      {lead && canManageEmail && (
        <CoreEmailComposeDialog
          open={isEmailDialogOpen}
          onOpenChange={setIsEmailDialogOpen}
          workspaceId={workspace?.id || ''}
          accounts={coreEmailAccounts}
          entityType="lead"
          entityId={leadId}
          initialTo={lead.email || undefined}
          templateContext={{
            lead_name: fullName,
            lead_email: lead.email,
          }}
        />
      )}

      {/* Page-level Assign User Modal (works from accordion header even when collapsed) */}
      {workspace?.id && (
        <AssignUserModal
          isOpen={isAssignModalOpen}
          onOpenChange={setIsAssignModalOpen}
          leadId={leadId}
          workspaceId={workspace.id}
          currentAssignees={pageAssignees}
          onAssign={(userId) => pageAssignMutation.mutate(userId)}
          isLoading={pageAssignMutation.isPending}
        />
      )}
    </ModuleGuard>
  );
}
