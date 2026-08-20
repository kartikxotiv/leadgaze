'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { Textarea } from '@kit/ui/textarea';

import { calculateLeadScore } from '~/lib/lead-scoring/lead-scoring-engine';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { Lead } from '~/services/leads.service';
import ApiClient from '~/utils/axios-client';

import { LeadCustomFieldInputs } from '~/components/leads/lead-custom-field-inputs';

import { IndustrySelect } from '../../_components/industry-select';
import { LeadSourceSelect } from '../../_components/lead-source-select';
import { ManageableStatusSelect } from '../../_components/manageable-status-select';

interface EditLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lead: Lead;
}

interface FormDataState {
  first_name: string;
  last_name: string;
  email: string;
  alt_email: string;
  phone_number: string;
  mobile_number: string;
  company_name: string;
  company_website: string;
  company_linkedin_url: string;
  linkedin_url: string;
  job_title: string;
  department: string;
  industry_id: string;
  company_size: string;
  location: string;
  timezone: string;
  status_id: string;
  source_id: string;
  trigger: string;
  notes: string;
  lead_score: number;
}

const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (1-10)' },
  { value: 'small', label: 'Small (11-50)' },
  { value: 'medium', label: 'Medium (51-500)' },
  { value: 'large', label: 'Large (501-5000)' },
  { value: 'enterprise', label: 'Enterprise (5000+)' },
];

/** Renders children (a form field) only when the user has edit permission for the given FLS field_key. */
function FieldGuard({
  fieldKey,
  canEdit,
  children,
}: {
  fieldKey: string;
  canEdit: (key: string) => boolean;
  children: React.ReactNode;
}) {
  if (!canEdit(fieldKey)) return null;
  return <>{children}</>;
}

export default function EditLeadDialog({
  open,
  onOpenChange,
  onSuccess,
  lead,
}: EditLeadDialogProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { canEdit, canView, editableCustomFields, visibleCustomFields, isLoading: permissionsLoading } = useFieldPermissions({
    entityType: 'leads',
    workspaceId: workspace?.id,
    enabled: open && !!workspace?.id && !!lead,
    staleTime: 5 * 60 * 1000,
  });
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [customFields, setCustomFields] = useState<Record<string, unknown>>({});
  const [formData, setFormData] = useState<FormDataState>({
    first_name: '',
    last_name: '',
    email: '',
    alt_email: '',
    phone_number: '',
    mobile_number: '',
    company_name: '',
    company_website: '',
    company_linkedin_url: '',
    linkedin_url: '',
    job_title: '',
    department: '',
    industry_id: '',
    company_size: '',
    location: '',
    timezone: '',
    status_id: '',
    source_id: '',
    trigger: '',
    notes: '',
    lead_score: 0,
  });

  // Initialize form with lead data
  useEffect(() => {
    if (lead && open) {
      setFormData({
        first_name: lead.first_name || '',
        last_name: lead.last_name || '',
        email: lead.email || '',
        alt_email: lead.alt_email || '',
        phone_number: lead.phone_number || '',
        mobile_number: lead.mobile_number || '',
        company_name: lead.company_name || '',
        company_website: lead.company_website || '',
        company_linkedin_url: lead.company_linkedin_url || '',
        linkedin_url: lead.linkedin_url || '',
        job_title: lead.job_title || '',
        department: lead.department || '',
        industry_id: lead.industry_id || lead.industry?.id || '',
        company_size: lead.company_size || '',
        location: lead.location || '',
        timezone: lead.timezone || '',
        status_id: lead.status_id || '',
        source_id: lead.source_id || '',
        trigger: lead.trigger || '',
        notes: lead.notes || '',
        lead_score: lead.lead_score || 0,
      });
      setCustomFields((lead.custom_fields as Record<string, unknown>) || {});
    }
  }, [lead, open]);

  // Reactive lead scoring
  useEffect(() => {
    if (!open) return;

    const { totalScore } = calculateLeadScore({
      first_name: formData.first_name,
      last_name: formData.last_name,
      company_name: formData.company_name,
      industry_id: formData.industry_id,
      company_size: formData.company_size,
      location: formData.location,
      timezone: formData.timezone,
      job_title: formData.job_title,
      status_key: undefined,
      contacted_count: lead.contacted_count || 0,
      custom_fields: lead.custom_fields || {},
    });

    if (formData.lead_score !== totalScore) {
      setFormData((prev) => ({ ...prev, lead_score: totalScore }));
    }
  }, [
    formData.first_name,
    formData.last_name,
    formData.company_name,
    formData.industry_id,
    formData.company_size,
    formData.location,
    formData.timezone,
    formData.job_title,
    formData.linkedin_url,
    formData.status_id,
    open,
    lead.contacted_count,
    lead.custom_fields,
  ]);

  const handleInputChange = useCallback(
    (field: keyof FormDataState, value: string | number | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      const response = await ApiClient.patch(`/leads/${lead.id}`, payload);
      return response.data?.data || null;
    },
    onSuccess: () => {
      toast.success('Lead updated successfully');
      queryClient.invalidateQueries({ queryKey: ['lead', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
      onSuccess();
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to update lead';
      toast.error(message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name.trim()) {
      toast.error('First name is required');
      return;
    }

    if (!formData.status_id) {
      toast.error('Status is required');
      return;
    }

    setIsLoading(true);
    try {
      const { totalScore } = calculateLeadScore({
        first_name: formData.first_name,
        last_name: formData.last_name,
        company_name: formData.company_name,
        industry_id: formData.industry_id,
        company_size: formData.company_size,
        location: formData.location,
        timezone: formData.timezone,
        job_title: formData.job_title,
        status_key: undefined,
        contacted_count: lead.contacted_count || 0,
        custom_fields: lead.custom_fields || {},
      });

      // Only include fields in the payload that the user has edit access to.
      // The server also validates this, but we avoid sending garbage.
      const payload: Record<string, unknown> = {};
      if (canEdit('first_name')) payload.first_name = formData.first_name;
      if (canEdit('last_name')) payload.last_name = formData.last_name;
      if (canEdit('email')) payload.email = formData.email;
      if (canEdit('alt_email')) payload.alt_email = formData.alt_email;
      if (canEdit('phone')) payload.phone_number = formData.phone_number;
      if (canEdit('mobile')) payload.mobile_number = formData.mobile_number;
      if (canEdit('company')) payload.company_name = formData.company_name;
      if (canEdit('company_website')) payload.company_website = formData.company_website;
      if (canEdit('company_linkedin')) payload.company_linkedin_url = formData.company_linkedin_url;
      if (canEdit('linkedin')) payload.linkedin_url = formData.linkedin_url;
      if (canEdit('job_title')) payload.job_title = formData.job_title;
      if (canEdit('department')) payload.department = formData.department;
      if (canEdit('industry')) payload.industry_id = formData.industry_id || null;
      if (canEdit('company_size')) payload.company_size = formData.company_size || null;
      if (canEdit('location')) payload.location = formData.location;
      if (canEdit('timezone')) payload.timezone = formData.timezone;
      if (canEdit('status')) payload.status_id = formData.status_id;
      if (canEdit('source')) payload.source_id = formData.source_id || null;
      if (canEdit('trigger')) payload.trigger = formData.trigger;
      const editableCustom: Record<string, unknown> = {};
      for (const [cfKey, cfVal] of Object.entries(customFields)) {
        if (canEdit(cfKey)) {
          editableCustom[cfKey] = cfVal;
        }
      }
      payload.custom_fields = editableCustom;

      await mutation.mutateAsync(payload);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[800px] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle>
              Edit Lead
            </DialogTitle>
            <DialogDescription>
              Update the lead information
            </DialogDescription>
          </DialogHeader>

          <form id="dialog-form"
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex flex-col flex-1 overflow-y-auto p-2 gap-2">
              {/* ── Contact Information ── */}
              <div className="space-y-2">
                <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                  Contact Information
                </h3>                

                <div className="grid grid-cols-2 gap-2">
                  <FieldGuard fieldKey="first_name" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="first_name">
                        First Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="first_name"
                        placeholder="John"
                        value={formData.first_name}
                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                        required
                      />
                    </div>
                  </FieldGuard>
                  <FieldGuard fieldKey="last_name" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="last_name">Last Name (Optional)</Label>
                      <Input
                        id="last_name"
                        placeholder="Doe"
                        value={formData.last_name}
                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FieldGuard fieldKey="email" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="email">Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                  <FieldGuard fieldKey="alt_email" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="alt_email">Alternative Email (Optional)</Label>
                      <Input
                        id="alt_email"
                        type="email"
                        placeholder="john.doe@work.com"
                        value={formData.alt_email}
                        onChange={(e) => handleInputChange('alt_email', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FieldGuard fieldKey="phone" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="phone_number">Phone (Optional)</Label>
                      <Input
                        id="phone_number"
                        placeholder="+1 (555) 123-4567"
                        value={formData.phone_number}
                        onChange={(e) => handleInputChange('phone_number', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                  <FieldGuard fieldKey="mobile" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="mobile_number">Mobile (Optional)</Label>
                      <Input
                        id="mobile_number"
                        placeholder="+1 (555) 987-6543"
                        value={formData.mobile_number}
                        onChange={(e) => handleInputChange('mobile_number', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                </div>
              </div>

              {/* ── Company Information ── */}
              <div className="space-y-2">
                <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                  Company Information
                </h3>                

                <div className="grid grid-cols-2 gap-2">
                  <FieldGuard fieldKey="company" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="company_name">Company Name (Optional)</Label>
                      <Input
                        id="company_name"
                        placeholder="Acme Inc."
                        value={formData.company_name}
                        onChange={(e) => handleInputChange('company_name', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                  <FieldGuard fieldKey="job_title" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="job_title">Job Title (Optional)</Label>
                      <Input
                        id="job_title"
                        placeholder="Sales Manager"
                        value={formData.job_title}
                        onChange={(e) => handleInputChange('job_title', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FieldGuard fieldKey="industry" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="industry_id">Industry (Optional)</Label>
                      <div>
                        <IndustrySelect
                          value={formData.industry_id}
                          onValueChange={(value) => handleInputChange('industry_id', value)}
                          disabled={isLoading}
                          className="border-gray-300 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </FieldGuard>
                  <FieldGuard fieldKey="company_size" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="company_size">Company Size (Optional)</Label>
                      <Select
                        value={formData.company_size}
                        onValueChange={(value) => handleInputChange('company_size', value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="border-gray-300 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                          <SelectValue placeholder="Select company size" />
                        </SelectTrigger>
                        <SelectContent className="z-50 border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                          {COMPANY_SIZES.map((size) => (
                            <SelectItem key={size.value} value={size.value}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldGuard>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FieldGuard fieldKey="company_website" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="company_website">Website (Optional)</Label>
                      <Input
                        id="company_website"
                        placeholder="https://acme.com"
                        value={formData.company_website}
                        onChange={(e) => handleInputChange('company_website', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                  <FieldGuard fieldKey="company_linkedin" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="company_linkedin_url">Company LinkedIn (Optional)</Label>
                      <Input
                        id="company_linkedin_url"
                        placeholder="https://linkedin.com/company/..."
                        value={formData.company_linkedin_url}
                        onChange={(e) => handleInputChange('company_linkedin_url', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FieldGuard fieldKey="department" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="department">Department (Optional)</Label>
                      <Input
                        id="department"
                        placeholder="Engineering"
                        value={formData.department}
                        onChange={(e) => handleInputChange('department', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                  <FieldGuard fieldKey="linkedin" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="linkedin_url">Personal LinkedIn (Optional)</Label>
                      <Input
                        id="linkedin_url"
                        placeholder="https://linkedin.com/in/..."
                        value={formData.linkedin_url}
                        onChange={(e) => handleInputChange('linkedin_url', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FieldGuard fieldKey="location" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="location">Location (Optional)</Label>
                      <Input
                        id="location"
                        placeholder="New York, USA"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                  <FieldGuard fieldKey="timezone" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="timezone">Timezone (Optional)</Label>
                      <Input
                        id="timezone"
                        placeholder="America/New_York"
                        value={formData.timezone}
                        onChange={(e) => handleInputChange('timezone', e.target.value)}
                        disabled={isLoading}
                        className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>
                  </FieldGuard>
                </div>
              </div>

              {/* ── Lead Information ── */}
              <div className="space-y-2">
                <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                  Lead Information
                </h3>                

                <div className="grid grid-cols-2 gap-2">
                  {/* Status is always shown — required field */}
                  <div>
                    <Label htmlFor="status_id">
                      Status <span className="text-red-500">*</span>
                    </Label>
                    <div>
                      <ManageableStatusSelect
                        moduleKey="leads"
                        workspaceId={workspace?.id ?? ''}
                        value={formData.status_id}
                        onValueChange={(value) => handleInputChange('status_id', value)}
                        disabled={isLoading || !canEdit('status')}
                        triggerClassName="border-gray-300 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <FieldGuard fieldKey="source" canEdit={canEdit}>
                    <div>
                      <Label htmlFor="source_id">Lead Source (Optional)</Label>
                      <div>
                        <LeadSourceSelect
                          value={formData.source_id}
                          onValueChange={(value) => handleInputChange('source_id', value)}
                          disabled={isLoading}
                          placeholder="Select source"
                          className="border-gray-300 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </FieldGuard>
                </div>

                <FieldGuard fieldKey="trigger" canEdit={canEdit}>
                  <div>
                    <Label htmlFor="trigger">Trigger (Optional)</Label>
                    <Input
                      id="trigger"
                      placeholder="e.g., Inbound inquiry"
                      value={formData.trigger}
                      onChange={(e) => handleInputChange('trigger', e.target.value)}
                      disabled={isLoading}
                      className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                    />
                  </div>
                </FieldGuard>
              </div>

              {/* ── Additional Information ── */}
              <FieldGuard fieldKey="notes" canEdit={canEdit}>
                <div className="space-y-2">
                  <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                    Additional Information
                  </h3>                  

                  <div>
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any additional notes about this lead..."
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      disabled={isLoading}
                      className="border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                      rows={4}
                    />
                  </div>
                </div>
              </FieldGuard>

              {/* ── Custom Fields ── Only fields user can view/edit are shown */}
              <LeadCustomFieldInputs
                fields={visibleCustomFields}
                values={customFields}
                onChange={(key, value) =>
                  setCustomFields((prev) => ({ ...prev, [key]: value }))
                }
                canEdit={canEdit}
                canView={canView}
              />
            </div>

          </form>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}                
            >
              Cancel
            </Button>
            <Button type="submit" form="dialog-form" disabled={isLoading} className="gap-2">
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
