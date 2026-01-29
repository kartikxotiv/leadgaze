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

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  createLeadService,
  getLeadSourcesService,
  getLeadStatusesService,
} from '~/services/leads.service';
import { IndustrySelect } from '../../_components/industry-select';

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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
  is_public: boolean;
}

const COMPANY_SIZES = [
  { value: 'startup', label: 'Startup (1-10)' },
  { value: 'small', label: 'Small (11-50)' },
  { value: 'medium', label: 'Medium (51-500)' },
  { value: 'large', label: 'Large (501-5000)' },
  { value: 'enterprise', label: 'Enterprise (5000+)' },
];

export default function CreateLeadDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateLeadDialogProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
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
    is_public: true,
  });

  // Fetch available sources
  const {
    data: sources = [],
    isLoading: sourcesLoading,
    error: sourcesError,
  } = useQuery({
    queryKey: ['lead-sources', workspace?.id],
    queryFn: () => {
      if (!workspace?.id) {
        return Promise.resolve([]);
      }

      return getLeadSourcesService(workspace.id).catch((error) => {
        console.error('❌ Error fetching sources:', error);
        toast.error('Failed to load sources');
        return [];
      });
    },
    enabled: !!workspace,
  });

  // Fetch available statuses
  const {
    data: statuses = [],
    isLoading: statusesLoading,
    error: statusesError,
  } = useQuery({
    queryKey: ['lead-statuses', workspace?.id],
    queryFn: () => {
      if (!workspace?.id) {
        return Promise.resolve([]);
      }

      return getLeadStatusesService(workspace.id).catch((error) => {
        console.error('❌ Error fetching statuses:', error);
        toast.error('Failed to load statuses');
        return [];
      });
    },
    enabled: !!workspace,
  });


  // Debug log for sources and statuses
  useEffect(() => { }, [sources, sourcesLoading, workspace]);

  useEffect(() => { }, [statuses, statusesLoading, workspace]);

  const handleInputChange = useCallback(
    (field: keyof FormDataState, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

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
      is_public: true,
    });
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
      // Build payload with only non-empty fields
      const payload: any = {
        first_name: formData.first_name,
        status_id: formData.status_id,
      };

      // Add optional fields only if they have values
      if (formData.last_name) payload.last_name = formData.last_name;
      if (formData.email) payload.email = formData.email;
      if (formData.alt_email) payload.alt_email = formData.alt_email;
      if (formData.phone_number) payload.phone_number = formData.phone_number;
      if (formData.mobile_number)
        payload.mobile_number = formData.mobile_number;
      if (formData.company_name) payload.company_name = formData.company_name;
      if (formData.company_website)
        payload.company_website = formData.company_website;
      if (formData.company_linkedin_url)
        payload.company_linkedin_url = formData.company_linkedin_url;
      if (formData.job_title) payload.job_title = formData.job_title;
      if (formData.department) payload.department = formData.department;
      if (formData.industry_id) payload.industry_id = formData.industry_id;
      if (formData.company_size) payload.company_size = formData.company_size;
      if (formData.location) payload.location = formData.location;
      if (formData.timezone) payload.timezone = formData.timezone;
      if (formData.source_id) payload.source_id = formData.source_id;
      if (formData.trigger) payload.trigger = formData.trigger;
      if (formData.notes) payload.notes = formData.notes;
      payload.is_public = formData.is_public;

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
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[800px] dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle className="pr-12 text-2xl text-gray-900 dark:text-white">
              Add New Lead
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Fill in the lead information. Required fields are marked with{' '}
              <span className="text-red-500">*</span>
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex-1 space-y-8 overflow-y-auto p-6 pb-8"
          >
            {/* Contact Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Contact Information
              </h3>
              <Separator className="bg-gray-200 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="first_name"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
                <div>
                  <Label
                    htmlFor="last_name"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="email"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
                <div>
                  <Label
                    htmlFor="alt_email"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="phone_number"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
                    htmlFor="mobile_number"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Company Information
              </h3>
              <Separator className="bg-gray-200 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="company_name"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
                    htmlFor="industry_id"
                    className="text-gray-900 dark:text-gray-100"
                  >
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="company_website"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
                    htmlFor="company_linkedin_url"
                    className="text-gray-900 dark:text-gray-100"
                  >
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="company_size"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
                    htmlFor="department"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
            </div>

            {/* Professional Information Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Professional Information
              </h3>
              <Separator className="bg-gray-200 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="job_title"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
                    htmlFor="location"
                    className="text-gray-900 dark:text-gray-100"
                  >
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
                  htmlFor="timezone"
                  className="text-gray-900 dark:text-gray-100"
                >
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lead Information
              </h3>
              <Separator className="bg-gray-200 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label
                    htmlFor="status_id"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.status_id}
                    onValueChange={(value) =>
                      handleInputChange('status_id', value)
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="mt-2 border-gray-300 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent className="z-50 border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                      {statuses && statuses.length > 0 ? (
                        statuses.map((status: any) => (
                          <SelectItem key={status.id} value={status.id}>
                            {status.status_name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="placeholder" disabled>
                          No statuses available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label
                    htmlFor="source_id"
                    className="text-gray-900 dark:text-gray-100"
                  >
                    Lead Source (Optional)
                  </Label>
                  <Select
                    value={formData.source_id}
                    onValueChange={(value) =>
                      handleInputChange('source_id', value)
                    }
                    disabled={isLoading}
                  >
                    <SelectTrigger className="mt-2 border-gray-300 bg-white text-gray-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white">
                      <SelectValue placeholder="Select a source" />
                    </SelectTrigger>
                    <SelectContent className="z-50 border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-900">
                      {sources && sources.length > 0 ? (
                        sources.map((source: any) => (
                          <SelectItem key={source.id} value={source.id}>
                            {source.source_name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="placeholder" disabled>
                          No sources available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="trigger"
                  className="text-gray-900 dark:text-gray-100"
                >
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
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Additional Information
              </h3>
              <Separator className="bg-gray-200 dark:bg-slate-800" />

              <div className="flex items-start gap-3">
                <Checkbox
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => {
                    setFormData((prev) => ({
                      ...prev,
                      is_public: checked as boolean,
                    }));
                  }}
                  disabled={isLoading}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label
                    htmlFor="is_public"
                    className="cursor-pointer text-sm font-medium text-gray-900 dark:text-gray-100"
                  >
                    Make this lead public
                  </Label>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    When public, this lead will be visible to all team members
                    with "View leads" access. When private, only you and
                    assigned team members can see it.
                  </p>
                </div>
              </div>

              <div>
                <Label
                  htmlFor="notes"
                  className="text-gray-900 dark:text-gray-100"
                >
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

            {/* Form Actions */}
            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-200 bg-white pt-6 dark:border-slate-800 dark:bg-slate-950">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
                className="border-gray-300 text-gray-900 dark:border-slate-700 dark:text-white"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="gap-2">
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Lead
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
