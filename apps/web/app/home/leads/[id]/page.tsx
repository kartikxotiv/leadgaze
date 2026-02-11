'use client';

import React, { useMemo, useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  Clock,
  Edit2,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { useUser } from '@kit/supabase/hooks/use-user';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Input } from '@kit/ui/input';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';
import { cn } from '@kit/ui/utils';

import { PublicPrivateToggle } from '~/home/_components/public-private-toggle';
import { calculateLeadScore } from '~/lib/lead-scoring/lead-scoring-engine';
import {
  useCanAccessData,
  usePermissionDetail,
} from '~/lib/permissions/use-permissions';
import { ModuleGuard } from '~/lib/rbac/module-guard';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getLeadByIdService,
  getLeadStatusesService,
  updateLeadService,
} from '~/services/leads.service';

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

export default function LeadDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { currentWorkspace: workspace } = useRBAC();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string | null>(
    null,
  );
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isLogCallDialogOpen, setIsLogCallDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
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

  const { data: user } = useUser();
  const editPermission = usePermissionDetail('leads', 'edit');
  const canEdit = useCanAccessData(editPermission, lead?.owner_id, user?.id);

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
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">Loading workspace...</p>
      </div>
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
        <PageHeader title="Lead Details" />
        <PageBody>
          <div className="flex h-96 items-center justify-center">
            <p className="text-gray-500">Loading lead details...</p>
          </div>
        </PageBody>
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
      <PageHeader title="Lead Details">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusModalOpen(true)}
            className="flex h-8 items-center justify-center px-4"
            disabled={isSaving || !canEdit}
            title={
              !canEdit ? 'You do not have permission to edit this lead' : ''
            }
          >
            Change Status
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLogCallDialogOpen(true)}
            className="p-3"
            disabled={!canEdit}
            title={
              !canEdit
                ? 'You do not have permission to log calls'
                : 'Log a call'
            }
          >
            {/* Phone icon */}
            {/* Log Call */}
            <div className="flex items-center justify-center rounded-full bg-[#44bbb3] p-2">
              <Phone className="h-3 w-3 text-white" />
            </div>
          </Button>

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
          {!lead.is_converted_to_account && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleConvertLead}
              className="flex h-8 items-center justify-center px-4"
              disabled={isSaving || !canEdit}
              title={
                !canEdit
                  ? 'You do not have permission to convert this lead'
                  : ''
              }
            >
              Convert Lead
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="flex h-8 items-center justify-center gap-2 px-4"
            disabled={!canEdit}
            title={
              !canEdit ? 'You do not have permission to edit this lead' : ''
            }
          >
            <Edit2 className="h-4 w-4" />
            Edit Full Profile
          </Button>
        </div>
      </PageHeader>

      <PageBody>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Header Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="mb-2 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-lg font-semibold text-white"
                    style={{
                      backgroundImage: `linear-gradient(135deg, ${statusColor}80 0%, ${statusColor} 100%)`,
                    }}
                  >
                    {lead.first_name.charAt(0)}
                    {lead.last_name?.charAt(0)}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {fullName}
                    </h1>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                      {lead.job_title && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {lead.job_title}
                        </p>
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
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status and Source Badges */}
                <div className="flex flex-wrap gap-2">
                  {lead.status && (
                    <Badge
                      className="px-3 py-1"
                      style={{
                        backgroundColor: statusColor + '20',
                        color: statusColor,
                        border: `1px solid ${statusColor}40`,
                      }}
                    >
                      {lead.status.status_name}
                    </Badge>
                  )}
                  {lead.source && (
                    <Badge
                      variant="outline"
                      className="px-3 py-1"
                      style={{
                        borderColor: sourceColor,
                        color: sourceColor,
                      }}
                    >
                      {lead.source.source_name}
                    </Badge>
                  )}
                  {lead.is_public ? (
                    <Badge variant="outline" className="px-3 py-1">
                      Public
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-gray-100 px-3 py-1 dark:bg-gray-800"
                    >
                      Private
                    </Badge>
                  )}
                </div>

                {/* Key Information Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a
                        href={`mailto:${lead.email}`}
                        className="truncate text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {lead.email}
                      </a>
                    </div>
                  )}
                  {lead.phone_number && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <a
                        href={`tel:${lead.phone_number}`}
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        {lead.phone_number}
                      </a>
                    </div>
                  )}
                  {lead.company_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {lead.company_name}
                      </span>
                    </div>
                  )}
                  {lead.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {lead.location}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {lead.company_name && (
                  <EditableField
                    label="Company"
                    value={lead.company_name}
                    fieldName="company_name"
                  />
                )}
                {lead.job_title && (
                  <EditableField
                    label="Job Title"
                    value={lead.job_title}
                    fieldName="job_title"
                  />
                )}
                {lead.industry && (
                  <EditableField
                    label="Industry"
                    value={lead.industry.industry_name}
                    fieldName="industry_id"
                  />
                )}
                {lead.company_size && (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                        Company Size
                      </p>
                      <p className="mt-1 text-sm text-gray-900 capitalize dark:text-white">
                        {lead.company_size}
                      </p>
                    </div>
                  </div>
                )}
                {lead.company_website ? (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                        Website
                      </p>
                      <a
                        href={lead.company_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {lead.company_website}
                      </a>
                    </div>
                  </div>
                ) : null}
                {lead.company_linkedin_url ? (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                        Company LinkedIn
                      </p>
                      <a
                        href={lead.company_linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {lead.company_linkedin_url}
                      </a>
                    </div>
                  </div>
                ) : null}
                {lead.department && (
                  <EditableField
                    label="Department"
                    value={lead.department}
                    fieldName="department"
                  />
                )}
                {lead.notes && (
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                      Notes
                    </p>
                    <p className="mt-1 text-sm whitespace-pre-wrap text-gray-900 dark:text-white">
                      {lead.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {lead.email && (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                        Primary Email
                      </p>
                      <a
                        href={`mailto:${lead.email}`}
                        className="mt-1 block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}

                {lead.alt_email && (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                        Alternative Email
                      </p>
                      <a
                        href={`mailto:${lead.alt_email}`}
                        className="mt-1 block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {lead.alt_email}
                      </a>
                    </div>
                  </div>
                )}

                {lead.phone_number && (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                        Phone
                      </p>
                      <a
                        href={`tel:${lead.phone_number}`}
                        className="mt-1 block text-sm text-gray-700 dark:text-gray-300"
                      >
                        {lead.phone_number}
                      </a>
                    </div>
                  </div>
                )}

                {lead.mobile_number && (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                        Mobile
                      </p>
                      <a
                        href={`tel:${lead.mobile_number}`}
                        className="mt-1 block text-sm text-gray-700 dark:text-gray-300"
                      >
                        {lead.mobile_number}
                      </a>
                    </div>
                  </div>
                )}

                {lead.location && (
                  <EditableField
                    label="Location"
                    value={lead.location}
                    fieldName="location"
                  />
                )}

                {lead.timezone && (
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                      Timezone
                    </p>
                    <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                      {lead.timezone}
                    </p>
                  </div>
                )}

                {lead.linkedin_url && (
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-400">
                        LinkedIn
                      </p>
                      <a
                        href={lead.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-sm break-all text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {lead.linkedin_url}
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Assignees Section */}
            {workspace?.id && (
              <LeadAssignees leadId={leadId} workspaceId={workspace.id} />
            )}

            {/* Public/Private Toggle */}
            {workspace?.id && lead && (
              <PublicPrivateToggle
                entityType="lead"
                entityId={leadId}
                isPublic={lead.is_public}
                createdBy={lead.created_by}
                workspaceId={workspace.id}
              />
            )}

            {/* Notes Section */}
            <EntityNotes entityType="lead" entityId={leadId} />

            {/* Call Logs Section */}
            <EntityCalls entityType="lead" entityId={leadId} />
            {/* Email Activity (Drafts, Scheduled, Sent) */}
            <EntityEmails
              leadId={leadId}
              onOpenDraft={(draft) => {
                setSelectedDraft(draft);
                setIsEmailDialogOpen(true);
              }}
            />

            {/* Activity Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-400" />
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
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Lead Scoring Card */}
            {lead.lead_score !== null && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Lead Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center">
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

                  <div className="mt-4 space-y-4">
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
                </CardContent>
              </Card>
            )}

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

            {/* Meetings */}
            <EntityMeetings entityType="lead" entityId={leadId} />

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
        />
      )}
    </ModuleGuard>
  );
}
