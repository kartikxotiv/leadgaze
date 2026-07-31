'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
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
import { createLeadService, getLeadStatusesService } from '~/services/leads.service';

import { LeadCustomFieldInputs } from '~/components/leads/lead-custom-field-inputs';
import { LeadFormField } from '~/components/leads/lead-form-field';

import { IndustrySelect } from '../../_components/industry-select';
import { LeadSourceSelect } from '../../_components/lead-source-select';
import { ManageableStatusSelect } from '../../_components/manageable-status-select';

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (1-10)' },
  { value: 'small', label: 'Small (11-50)' },
  { value: 'medium', label: 'Medium (51-500)' },
  { value: 'large', label: 'Large (501-5000)' },
  { value: 'enterprise', label: 'Enterprise (5000+)' },
];

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

export default function CreateLeadDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateLeadDialogProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { canEdit, canView, editableCustomFields } = useFieldPermissions({
    entityType: 'leads',
    workspaceId: workspace?.id,
    enabled: open && !!workspace?.id,
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

  // Fetch available statuses
  const { data: statuses = [] } = useQuery({
    queryKey: ['lead-statuses', workspace?.id],
    queryFn: () => {
      if (!workspace?.id) {
        return Promise.resolve([]);
      }
      return getLeadStatusesService({ workspaceId: workspace.id }).catch((error) => {
        console.error('❌ Error fetching statuses:', error);
        return [];
      });
    },
    enabled: !!workspace,
  });

  useEffect(() => {}, [workspace]);

  const handleInputChange = useCallback(
    (field: keyof FormDataState, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Reactive lead scoring
  useEffect(() => {
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
      contacted_count: 0,
      custom_fields: {},
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
    formData.status_id,
  ]);

  const mutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!workspace) throw new Error('Workspace not found');
      return createLeadService({
        ...payload,
        workspace_id: workspace.id,
      });
    },
    onSuccess: () => {
      toast.success('Lead created successfully');
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['leads', workspace?.id] });
      onSuccess();
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to create lead';
      toast.error(message);
    },
  });

  const resetForm = () => {
    setFormData({
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
    setCustomFields({});
  };

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
      // Find selected status to get its key
      const selectedStatus = statuses.find(
        (s: any) => s.id === formData.status_id,
      );

      // Calculate lead score
      const { totalScore } = calculateLeadScore({
        first_name: formData.first_name,
        last_name: formData.last_name,
        company_name: formData.company_name,
        industry_id: formData.industry_id,
        company_size: formData.company_size,
        location: formData.location,
        timezone: formData.timezone,
        job_title: formData.job_title,
        status_key: selectedStatus?.status_key,
        // Engagement metrics (initial creation usually has 0)
        contacted_count: 0,
        custom_fields: {},
      });

      // Build payload with all fields
      const payload: any = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        alt_email: formData.alt_email,
        phone_number: formData.phone_number,
        mobile_number: formData.mobile_number,
        company_name: formData.company_name,
        company_website: formData.company_website,
        company_linkedin_url: formData.company_linkedin_url,
        linkedin_url: formData.linkedin_url,
        job_title: formData.job_title,
        department: formData.department,
        industry_id: formData.industry_id || null,
        company_size: formData.company_size || null,
        location: formData.location,
        timezone: formData.timezone,
        status_id: formData.status_id,
        source_id: formData.source_id || null,
        trigger: formData.trigger,
        notes: formData.notes,
        lead_score: totalScore,
        custom_fields: customFields,
      };

      await mutation.mutateAsync(payload);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 overflow-hidden border-gray-200 bg-white sm:max-w-[800px] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle>
              Add New Lead
            </DialogTitle>
            <DialogDescription>
              Fill in the lead information. Required fields are marked with{' '}
              <span className="text-red-500">*</span>
            </DialogDescription>
          </DialogHeader>

          <form id="dialog-form"
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 overflow-y-auto p-2 gap-2"
          >
            {/* Contact Information Section */}
            <div className="space-y-2">
              <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                Contact Informationss
              </h3>
              <Separator className="bg-gray-200 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-2">
                <LeadFormField formKey="first_name" canEdit={canEdit}>
                <div>
                  <Label
                    htmlFor="first_name">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    placeholder="John"
                    value={formData.first_name}
                    onChange={(e) =>
                      handleInputChange('first_name', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                    required
                  />
                </div>
                </LeadFormField>
                <LeadFormField formKey="last_name" canEdit={canEdit}>
                <div>
                  <Label
                    htmlFor="last_name">
                    Last Name (Optional)
                  </Label>
                  <Input
                    id="last_name"
                    placeholder="Doe"
                    value={formData.last_name}
                    onChange={(e) =>
                      handleInputChange('last_name', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
                </LeadFormField>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <LeadFormField formKey="email" canEdit={canEdit}>
                <div>
                  <Label
                    htmlFor="email">
                    Email (Optional)
                  </Label>
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
                </LeadFormField>
                <LeadFormField formKey="alt_email" canEdit={canEdit}>
                <div>
                  <Label
                    htmlFor="alt_email">
                    Alternative Email (Optional)
                  </Label>
                  <Input
                    id="alt_email"
                    type="email"
                    placeholder="john.doe@work.com"
                    value={formData.alt_email}
                    onChange={(e) =>
                      handleInputChange('alt_email', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
                </LeadFormField>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="phone_number">
                    Phone (Optional)
                  </Label>
                  <Input
                    id="phone_number"
                    placeholder="+1 (555) 123-4567"
                    value={formData.phone_number}
                    onChange={(e) =>
                      handleInputChange('phone_number', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="mobile_number">
                    Mobile (Optional)
                  </Label>
                  <Input
                    id="mobile_number"
                    placeholder="+1 (555) 987-6543"
                    value={formData.mobile_number}
                    onChange={(e) =>
                      handleInputChange('mobile_number', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Company Information Section */}
            <div className="space-y-2">
              <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                Company Information
              </h3>
              <Separator className="bg-gray-200 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="company_name">
                    Company Name (Optional)
                  </Label>
                  <Input
                    id="company_name"
                    placeholder="Acme Inc."
                    value={formData.company_name}
                    onChange={(e) =>
                      handleInputChange('company_name', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="industry_id">
                    Industry (Optional)
                  </Label>
                  <div className="mt-2">
                    <IndustrySelect
                      value={formData.industry_id}
                      onValueChange={(value) =>
                        handleInputChange('industry_id', value)
                      }
                      disabled={isLoading}
                      className="border-gray-300 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="company_website">
                    Website (Optional)
                  </Label>
                  <Input
                    id="company_website"
                    placeholder="https://acme.com"
                    value={formData.company_website}
                    onChange={(e) =>
                      handleInputChange('company_website', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="company_linkedin_url">
                    LinkedIn Company (Optional)
                  </Label>
                  <Input
                    id="company_linkedin_url"
                    placeholder="https://linkedin.com/company/acme"
                    value={formData.company_linkedin_url}
                    onChange={(e) =>
                      handleInputChange('company_linkedin_url', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="company_size">
                    Company Size (Optional)
                  </Label>
                  <Select
                    value={formData.company_size}
                    onValueChange={(value) =>
                      handleInputChange('company_size', value)
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="mt-2 border-gray-300 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
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
                <div>
                  <Label
                    htmlFor="department">
                    Department (Optional)
                  </Label>
                  <Input
                    id="department"
                    placeholder="Sales"
                    value={formData.department}
                    onChange={(e) =>
                      handleInputChange('department', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="linkedin_url">
                    Personal LinkedIn (Optional)
                  </Label>
                  <Input
                    id="linkedin_url"
                    placeholder="https://linkedin.com/in/..."
                    value={formData.linkedin_url}
                    onChange={(e) =>
                      handleInputChange('linkedin_url', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="space-y-2">
              <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                Professional Information
              </h3>
              <Separator className="bg-gray-200 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="job_title">
                    Job Title (Optional)
                  </Label>
                  <Input
                    id="job_title"
                    placeholder="Sales Manager"
                    value={formData.job_title}
                    onChange={(e) =>
                      handleInputChange('job_title', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="location">
                    Location (Optional)
                  </Label>
                  <Input
                    id="location"
                    placeholder="San Francisco, CA"
                    value={formData.location}
                    onChange={(e) =>
                      handleInputChange('location', e.target.value)
                    }
                    disabled={isLoading}
                    className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  />
                </div>
              </div>

              <div>
                <Label
                  htmlFor="timezone">
                  Timezone (Optional)
                </Label>
                <Input
                  id="timezone"
                  placeholder="America/Los_Angeles"
                  value={formData.timezone}
                  onChange={(e) =>
                    handleInputChange('timezone', e.target.value)
                  }
                  disabled={isLoading}
                  className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Lead Information Section */}
            <div className="space-y-2">
              <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                Lead Information
              </h3>
              <Separator className="bg-gray-200 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label
                    htmlFor="status_id">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <div className="mt-2">
                    <ManageableStatusSelect
                      moduleKey="leads"
                      workspaceId={workspace?.id ?? ''}
                      value={formData.status_id}
                      onValueChange={(value) =>
                        handleInputChange('status_id', value)
                      }
                      disabled={isLoading}
                      triggerClassName="border-gray-300 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label
                    htmlFor="source_id">
                    Lead Source (Optional)
                  </Label>
                  <div className="mt-2">
                    <LeadSourceSelect
                      value={formData.source_id}
                      onValueChange={(value) =>
                        handleInputChange('source_id', value)
                      }
                      disabled={isLoading}
                      placeholder="Select a source"
                      className="border-gray-300 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="trigger">
                  Trigger (Optional)
                </Label>
                <Input
                  id="trigger"
                  placeholder="e.g., Inbound inquiry, Referral"
                  value={formData.trigger}
                  onChange={(e) => handleInputChange('trigger', e.target.value)}
                  disabled={isLoading}
                  className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                />
              </div>
            </div>

            {/* Additional Notes Section */}
            <LeadFormField formKey="notes" canEdit={canEdit}>
            <div className="space-y-2">
              <h3 className="primary-heading text-leadgaze-dark dark:text-white custom-sub-heading-dialog-form">
                Additional Information
              </h3>
              <Separator className="bg-gray-200 dark:bg-slate-800" />

              <div>
                <Label
                  htmlFor="notes">
                  Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes about this lead..."
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  disabled={isLoading}
                  className="mt-2 border-gray-300 bg-white text-gray-900 placeholder:text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-gray-400"
                  rows={4}
                />
              </div>
            </div>
            </LeadFormField>

            <LeadCustomFieldInputs
              fields={editableCustomFields}
              values={customFields}
              onChange={(key, value) =>
                setCustomFields((prev) => ({ ...prev, [key]: value }))
              }
              canEdit={canEdit}
              canView={canView}
            />

            {/* Form Actions (Hidden here, moved outside) */}
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
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add Lead
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
