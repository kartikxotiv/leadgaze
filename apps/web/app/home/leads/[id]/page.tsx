'use client';

import React, { useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Clock,
  Edit2,
  Mail,
  MapPin,
  Phone,
  Trash2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { DetailHeader } from '@kit/ui/detail-header';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Skeleton } from '@kit/ui/skeleton';
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
import { getWorkspaceEmailAccountService } from '~/services/email.service';
import {
  getLeadByIdService,
  getLeadStatusesService,
  updateLeadService,
} from '~/services/leads.service';

import { DeleteEntityDialog } from '../../_components/delete-entity-dialog';
import {
  EntityDocuments,
  EntityMeetings,
  EntityReminders,
} from '../../_components/entity-activity';
import { EntityCalls } from '../../_components/entity-calls';
import { EntityEmails } from '../../_components/entity-emails';
import { EntityNotes } from '../../_components/entity-notes';
import { ChangeStatusDialog } from '../components/change-status-dialog';
import { ConvertLeadDialog } from '../components/convert-lead-dialog';
import EditLeadDialog from '../components/edit-lead-dialog';
import { EmailLeadDialog } from '../components/email-lead-dialog';
import { LeadAssignees } from '../components/lead-assignees';
import { LogCallDialog } from '../components/log-call-dialog';

import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CustomInputForView } from '@kit/ui/custom-input-for-view';

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
              <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
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
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-md" />
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-4 w-24" /></CardHeader>
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isLogCallDialogOpen, setIsLogCallDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<any>(null);

  const queryClient = useQueryClient();

  const leadId = params?.id as string;

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
  const { data: workspaceEmailAccount } = useQuery({
    queryKey: ['workspace_id', workspace?.id],
    queryFn: () => {
      if (!workspace?.id) throw new Error('Workspace ID is required');
      return getWorkspaceEmailAccountService(workspace.id);
    },
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
      return getLeadStatusesService(workspace.id);
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
  const statusColor = lead.status?.color || '#3B82F6';
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
      <div className="pt-4 pb-2 flex justify-between items-center w-full">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="border p-0 border-leadgaze-border">
            <Link href="/home/sales/leads">
              <ArrowLeft className="ml-2 mr-2 h-4 w-4" />
            </Link>
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg font-semibold">Lead details</h1>
            <p className="text-leadgaze-muted text-sm">View and edit lead information</p>
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
            Edit Profile
          </Button>
        )}
      </div>

      <PageBody className="pb-6">
        <DeleteEntityDialog
          isOpen={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          entityId={leadId}
          entityType="lead"
          entityName={`${lead.first_name} ${lead.last_name || ''}`}
          onSuccess={() => router.push('/home/sales/leads')}
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            <DetailHeader
              avatar={
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-lg font-semibold text-white">
                  {lead.first_name.charAt(0)}
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
                      Created on{' '}
                      {new Date(lead.created_at).toLocaleDateString(
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
              email={lead.email || undefined}
              actions={
                <div className="flex gap-2">
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatusModalOpen(true)}
                      className="flex h-8 items-center justify-center px-4"
                      disabled={isSaving}
                    >
                      Change Status
                    </Button>
                  )}

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
                    className={`flex h-8 w-8 items-center justify-center overflow-hidden p-0 ${!lead.email ? 'opacity-50' : ''}`}
                    disabled={!lead.email}
                    onClick={() => lead.email && setIsEmailDialogOpen(true)}
                    title={
                      !lead.email ? 'Lead has no email address' : 'Send email to lead'
                    }
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-400">
                      <Mail className="h-3.5 w-3.5 text-white" />
                    </div>
                  </Button>

                  {!lead.is_converted_to_account && canConvert && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConvertLead}
                      className="flex h-8 items-center justify-center px-4"
                      disabled={isSaving}
                    >
                      Convert Lead
                    </Button>
                  )}

                 
                </div>
              }
            />
{/* $$$$$$$$$$$$$*/}

            {/* Comapny */}
            <CardWidgetContainer title="Company" icon={<User className="w-5 h-5 text-leadgaze-dark dark:text-white" />}>
            <div className="flex-1">
              <div className="grid grid-cols-1 gap-4 px-6 py-3 md:grid-cols-2">
                {lead.company_name && (
                  <CustomInputForView
                    label="Company"
                    value={lead.company_name}                    
                  />                  
                )}
                
                {lead.job_title && (
                  <CustomInputForView
                    label="Job Title"
                    value={lead.job_title}                    
                  />                                    
                )}
                {lead.industry && (
                  <CustomInputForView
                    label="Industry"
                    value={lead.industry.industry_name}                    
                  />
                )}
                {lead.company_size && (
                  <CustomInputForView
                    label="Company Size"
                    value={lead.company_size}                    
                  />
                )}
                {lead.company_website ? (
                  <CustomInputForView
                    label="Website"
                    value={<a
                        href={lead.company_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                      >{lead.company_website}</a>}
                  />
                  
                ) : null}
                {lead.company_linkedin_url ? (
                  <CustomInputForView
                    label="Company LinkedIn"
                    value={<a
                        href={lead.company_linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                      >{lead.company_linkedin_url}</a>}
                  />                  
                ) : null}
                {lead.department && (
                  <CustomInputForView
                    label="Department"
                    value={lead.department}                    
                  />
                )}
                {lead.notes && (
                  <CustomInputForView
                    label="Notes"
                    value={lead.notes}                    
                    as="textarea"
                  />                  
                )}
              </div>
              
            </div>
            </CardWidgetContainer>
            

            {/* Contact Information Section */}
            <CardWidgetContainer title="Contact" icon={<User className="w-5 h-5 text-leadgaze-dark dark:text-white" />}>
              <div className="flex-1">
                <div className="grid grid-cols-1 gap-4 px-6 py-3 md:grid-cols-2">
                  {lead.email && (
                    <CustomInputForView
                      label="Primary Email"
                      value={<a
                          href={`mailto:${lead.email}`}
                          className="block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {lead.email}
                        </a>}
                    />                  
                  )}

                  {lead.alt_email && (
                    <CustomInputForView
                      label="Alternative Email"
                      value={<a
                          href={`mailto:${lead.alt_email}`}
                          className="block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {lead.alt_email}
                        </a>}
                    />
                  )}

                  {lead.phone_number && (
                    <CustomInputForView
                      label="Phone"
                      value={<a
                          href={`tel:${lead.phone_number}`}
                          className="block text-sm text-gray-700 dark:text-gray-300"
                        >
                          {lead.phone_number}
                        </a>}
                    />                  
                  )}

                  {lead.mobile_number && (
                    <CustomInputForView
                      label="Mobile"
                      value={<a
                          href={`tel:${lead.mobile_number}`}
                          className="block text-sm text-gray-700 dark:text-gray-300"
                        >
                          {lead.mobile_number}
                        </a>}
                    />
                  )}

                  {lead.location && (
                    <CustomInputForView
                      label="Location"
                      value={lead.location}
                    />                  
                  )}

                  {lead.timezone && (
                    <CustomInputForView
                      label="Timezone"
                      value={lead.timezone}
                    />
                  )}

                  {lead.linkedin_url && (
                    <CustomInputForView
                      label="LinkedIn"
                      value={<a
                          href={lead.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                        >
                          {lead.linkedin_url}
                        </a>}
                    />                  
                  )}

                </div>
              </div>
            </CardWidgetContainer>
            
            {/* Notes Section */}
            <EntityNotes entityType="lead" entityId={leadId} />            

            {/* Danger Zone */}
            {canAccess('leads', 'delete') && (
              <Card className="border-destructive/50 border-solid">
                <CardHeader>
                  <CardTitle className="text-destructive text-lg"></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Delete Lead</p>
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
          <div className="space-y-6">
            {/* Lead Scoring Card */}
            {lead.lead_score !== null && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-row items-start justify-between gap-6">
                    {/* Left side: Breakdown */}
                    <div className="flex-1 space-y-4 w-full">
                      <h3 className="text-base font-semibold text-zinc-950 dark:text-white mb-2">
                        Lead Score
                      </h3>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Total Score
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {scoringResult?.totalScore ?? lead.lead_score} / 100
                        </span>
                      </div>

                      {scoringResult && (
                        <div className="space-y-3 border-t pt-4">
                          <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
                            Breakdown
                          </p>

                          {/* Fit Score Breakdown */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs font-semibold text-gray-400">
                              <span>Fit Coverage</span>
                              <span>{scoringResult.fitScore} / 60</span>
                            </div>
                            {Object.entries(scoringResult.breakdown.fit).map(
                              ([label, score]) => (
                                <div
                                  key={label}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {label}
                                  </span>
                                  <span className="font-medium text-green-600">
                                    +{score}
                                  </span>
                                </div>
                              ),
                            )}
                          </div>

                          {/* Engagement Score Breakdown */}
                          {Object.keys(scoringResult.breakdown.engagement)
                            .length > 0 && (
                            <div className="space-y-1 pt-2">
                              <p className="text-xs font-semibold text-gray-400">
                                Engagement
                              </p>
                              {Object.entries(
                                scoringResult.breakdown.engagement,
                              ).map(([label, score]) => (
                                <div
                                  key={label}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {label}
                                  </span>
                                  <span className="font-medium text-blue-600">
                                    +{score}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Adjustments (Status) */}
                          {Object.keys(scoringResult.breakdown.adjustments)
                            .length > 0 && (
                            <div className="space-y-1 pt-2">
                              <p className="text-xs font-semibold text-gray-400">
                                Status Adjustments
                              </p>
                              {Object.entries(
                                scoringResult.breakdown.adjustments,
                              ).map(([label, score]) => (
                                <div
                                  key={label}
                                  className="flex justify-between text-xs"
                                >
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {label}
                                  </span>
                                  <span
                                    className={cn(
                                      'font-medium',
                                      score > 0
                                        ? 'text-green-600'
                                        : score === -100
                                          ? 'text-red-600'
                                          : 'text-amber-600',
                                    )}
                                  >
                                    {score > 0
                                      ? `+${score}`
                                      : score === -100
                                        ? 'Reset'
                                        : score}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side: Circular Progress Indicator */}
                    <div className="flex items-center justify-center flex-shrink-0 self-center sm:self-start">
                      <div className="relative h-24 w-24">
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
                            strokeWidth="2"
                            className="text-gray-200 dark:text-gray-700"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            fill="none"
                            stroke={statusColor}
                            strokeWidth="2"
                            strokeDasharray={`${((scoringResult?.totalScore ?? lead.lead_score) / 100) * 283} 283`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            {scoringResult?.totalScore ?? lead.lead_score}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lead Assignees Section */}
            {workspace?.id && (
              <LeadAssignees leadId={leadId} workspaceId={workspace.id} />
            )}

            {/* Meetings */}
            <EntityMeetings entityType="lead" entityId={leadId} />

            {/* Email Activity (Drafts, Scheduled, Sent) */}
            <EntityEmails
              entityId={leadId}
              entityType="lead"
              entityName={fullName}
              entityEmail={lead.email || undefined}
              onOpenDraft={(draft) => {
                setSelectedDraft(draft);
                setIsEmailDialogOpen(true);
              }}
            />
            
            {/* Call Logs Section */}
            <EntityCalls entityType="lead" entityId={leadId} />

            {/* Activity Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-leadgaze-dark dark:text-white" />
                  <CardTitle className="text-lg">Activity</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-900">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Lead Created
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(lead.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  {lead.updated_at && lead.updated_at !== lead.created_at && (
                    <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-900">
                      <div className="h-2 w-2 rounded-full bg-blue-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          Lead Updated
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(lead.updated_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Owner Information */}
            {lead.owner && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lead Owner</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}

            {/* Reminders */}
            <EntityReminders entityType="lead" entityId={leadId} />

            

            

            {/* Documents */}
            <EntityDocuments entityType="lead" entityId={leadId} />

            {/* Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                    Created
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                    Last Updated
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {new Date(lead.updated_at).toLocaleDateString()}
                  </p>
                </div>
                {lead.lead_score !== null && (
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                      Lead Score
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {scoringResult?.totalScore ?? lead.lead_score}/100
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
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
          onSuccess={() => refetch()}
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
      {/* Email Lead Dialog */}
      {lead && (
        <EmailLeadDialog
          open={isEmailDialogOpen}
          onOpenChange={(open) => {
            setIsEmailDialogOpen(open);
            if (!open) setSelectedDraft(null);
          }}
          leadId={leadId}
          leadEmail={lead.email || ''}
          leadName={fullName}
          initialDraft={selectedDraft}
          workspaceEmailAccounts={workspaceEmailAccount || []}
        />
      )}
    </ModuleGuard>
  );
}
