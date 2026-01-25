'use client';

import React, { useState } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  Clock,
  Download,
  Edit2,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Save,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Separator } from '@kit/ui/separator';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  getLeadByIdService,
  getLeadStatusesService,
  updateLeadService,
} from '~/services/leads.service';

import EditLeadDialog from '../components/edit-lead-dialog';
import { LeadAssignees } from '../components/lead-assignees';
import { ConvertLeadDialog } from '../components/convert-lead-dialog';
import { EntityNotes } from '../../_components/entity-notes';
import { EntityDocuments, EntityMeetings, EntityReminders } from '../../_components/entity-activity';
import { usePermissionDetail, useCanAccessData } from '~/lib/permissions/use-permissions';
import { useUser } from '@kit/supabase/hooks/use-user';

export default function LeadDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { currentWorkspace: workspace } = useRBAC();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState<string | null>(
    null,
  );
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);

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
    enabled: !!leadId,
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

  const handleInlineEdit = async (field: string, value: string) => {
    if (value === editValue) {
      setEditingField(null);
      return;
    }

    if (!value.trim()) {
      toast.error('Please enter a value');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {};
      payload[field] = value || null;

      await updateLeadService(leadId, payload);
      toast.success('Lead updated successfully');
      setEditingField(null);
      // Manually update the local data
      await refetch();
    } catch (err: any) {
      console.error('Update error:', err);
      toast.error(err.message || 'Failed to update lead');
    } finally {
      setIsSaving(false);
    }
  };

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
      <>
        <PageHeader title="Lead Details" />
        <PageBody>
          <div className="flex h-96 items-center justify-center">
            <p className="text-gray-500">Loading lead details...</p>
          </div>
        </PageBody>
      </>
    );
  }

  if (error || !lead) {
    return (
      <>
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
      </>
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
      {value && canEdit && (
        <Edit2
          className="h-4 w-4 flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          onClick={() => {
            setEditingField(fieldName);
            setEditValue(value || '');
          }}
        />
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="Lead Details">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStatusModalOpen(true)}
            className="gap-2"
            disabled={isSaving || !canEdit}
            title={!canEdit ? "You do not have permission to edit this lead" : ""}
          >
            Change Status
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleConvertLead}
            className="gap-2"
            disabled={isSaving || !canEdit}
            title={!canEdit ? "You do not have permission to convert this lead" : ""}
          >
            Convert Lead
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
            className="gap-2"
            disabled={!canEdit}
            title={!canEdit ? "You do not have permission to edit this lead" : ""}
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
                    {lead.job_title && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {lead.job_title}
                      </p>
                    )}
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
              <CardContent className="space-y-4">
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
                    value={lead.industry}
                    fieldName="industry"
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
                {lead.company_website && (
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
                    {canEdit && (
                      <Edit2
                        className="h-4 w-4 flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => {
                          setEditingField('company_website');
                          setEditValue(lead.company_website || '');
                        }}
                      />
                    )}
                  </div>
                )}
                {lead.department && (
                  <EditableField
                    label="Department"
                    value={lead.department}
                    fieldName="department"
                  />
                )}
              </CardContent>
            </Card>

            {/* Contact Information Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    {canEdit && (
                      <Edit2
                        className="h-4 w-4 flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => {
                          setEditingField('email');
                          setEditValue(lead.email || '');
                        }}
                      />
                    )}
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
                    {canEdit && (
                      <Edit2
                        className="h-4 w-4 flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => {
                          setEditingField('alt_email');
                          setEditValue(lead.alt_email || '');
                        }}
                      />
                    )}
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
                    {canEdit && (
                      <Edit2
                        className="h-4 w-4 flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => {
                          setEditingField('phone_number');
                          setEditValue(lead.phone_number || '');
                        }}
                      />
                    )}
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
                    {canEdit && (
                      <Edit2
                        className="h-4 w-4 flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => {
                          setEditingField('mobile_number');
                          setEditValue(lead.mobile_number || '');
                        }}
                      />
                    )}
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
                        className="mt-1 block text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        View Profile
                      </a>
                    </div>
                    {canEdit && (
                      <Edit2
                        className="h-4 w-4 flex-shrink-0 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        onClick={() => {
                          setEditingField('linkedin_url');
                          setEditValue(lead.linkedin_url || '');
                        }}
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lead Assignees Section */}
            {workspace?.id && (
              <LeadAssignees leadId={leadId} workspaceId={workspace.id} />
            )}

            {/* Notes Section */}
            {/* Notes Section */}
            <EntityNotes entityType="lead" entityId={leadId} />

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
                          strokeDasharray={`${(lead.lead_score / 100) * 283} 283`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {lead.lead_score}
                        </span>
                      </div>
                    </div>
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
                      {lead.lead_score}/100
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

      {/* Inline Edit Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="mx-4 w-full max-w-sm">
            <CardHeader>
              <CardTitle className="capitalize">
                Edit {editingField.replace(/_/g, ' ')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleInlineEdit(editingField, editValue);
                  } else if (e.key === 'Escape') {
                    setEditingField(null);
                  }
                }}
                autoFocus
                placeholder={`Enter ${editingField.replace(/_/g, ' ')}`}
                disabled={isSaving}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingField(null)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleInlineEdit(editingField, editValue)}
                  disabled={isSaving}
                  className="gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Change Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="mx-4 w-full max-w-sm">
            <CardHeader>
              <CardTitle>Change Lead Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusesLoading ? (
                <div className="flex justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {statuses.map((status: any) => (
                    <button
                      key={status.id}
                      onClick={() => {
                        setSelectedNewStatus(status.id);
                        handleStatusChange(status.id);
                      }}
                      disabled={isSaving}
                      className="w-full rounded-md border border-gray-200 px-4 py-2 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{
                            backgroundColor: status.status_color || '#6b7280',
                          }}
                        />
                        <span className="font-medium">
                          {status.status_name}
                        </span>
                        {status.is_closed && (
                          <span className="ml-auto text-xs text-gray-500">
                            Closed
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusModalOpen(false);
                    setSelectedNewStatus(null);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
