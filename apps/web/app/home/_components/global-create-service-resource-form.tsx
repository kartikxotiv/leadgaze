'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { Label } from '@kit/ui/label';
import { Input } from '@kit/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@kit/ui/select';
import { DialogFooter } from '@kit/ui/dialog';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { useDynamicColumns } from '~/lib/hooks/use-dynamic-columns';
import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import { createServiceCloudResourceService, type ServiceCloudRecord } from '@kit/service-cloud';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';

interface Props {
  title: string;
  endpoint: 'customers' | 'organizations';
  entityType: 'customers' | 'organizations';
  productKey: string;
  onSuccess: () => void;
  onCancel: () => void;
  asFormOnly: boolean;
}

export function GlobalCreateServiceResourceForm({ title, endpoint, entityType, productKey, onSuccess, onCancel, asFormOnly = false }: Props) {
  const { currentWorkspace, user } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const client = getSupabaseBrowserClient();

  const [form, setForm] = useState<ServiceCloudRecord>({});

  const SYSTEM_FIELDS_CUSTOMERS = [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
    { key: 'job_title', label: 'Job Title', type: 'text' },
  ];
  
  const SYSTEM_FIELDS_ORGS = [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'website', label: 'Website', type: 'text' },
    { key: 'industry', label: 'Industry', type: 'text' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'phone', label: 'Phone', type: 'text' },
  ];

  const systemFields = entityType === 'customers' ? SYSTEM_FIELDS_CUSTOMERS : SYSTEM_FIELDS_ORGS;

  const { fields: customFields = [] } = useDynamicColumns({
    entityType,
    workspaceId,
    userId: user?.id,
    productKey,
    enabled: !!workspaceId && !!user?.id,
  });

  const { canView: canViewField, canEdit: canEditField } = useFieldPermissions({
    entityType,
    workspaceId,
    enabled: !!workspaceId && !!user?.id,
    productKey,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ServiceCloudRecord) => {
      return await createServiceCloudResourceService(endpoint, {
        workspace_id: workspaceId,
        ...data,
      });
    },
    onSuccess: () => {
      toast.success(`${title} created successfully`);
      queryClient.invalidateQueries({ queryKey: ['service-cloud', endpoint, workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['service-cloud', 'dashboard', workspaceId] });
      onSuccess();
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(`Failed to create ${title}`);
    },
  });

  const customFieldsFormatted = customFields
    .filter((f: any) => !f.is_system)
    .map((f: any) => ({
      key: f.field_key,
      label: f.field_label || f.field_key,
      type: f.field_type,
      required: f.is_required,
      options: f.settings?.options || [],
    }));

  const systemFieldsFormatted = systemFields.map((sf) => {
    const dbField = customFields.find((f: any) => f.field_key === sf.key);
    return {
      ...sf,
      label: dbField?.field_label || sf.label,
    };
  });

  const allFields = [...systemFieldsFormatted, ...customFieldsFormatted];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const phoneRegex = /^\\+?[0-9]+$/;
    if (form.phone && !phoneRegex.test(form.phone)) {
      toast.error('Phone number can only contain numbers, optionally starting with +');
      return;
    }
    
    const systemPayload: any = {};
    const customPayload: any = {};
    const customFieldKeys = new Set(customFieldsFormatted.map((f: any) => f.key));
    
    Object.entries(form).forEach(([key, value]) => {
      if (customFieldKeys.has(key)) {
        customPayload[key] = value;
      } else {
        systemPayload[key] = value;
      }
    });
    
    if (Object.keys(customPayload).length > 0) {
      systemPayload.custom_fields = customPayload;
    }
    
    createMutation.mutate(systemPayload);
  };

  return (
    <div className="flex h-full flex-col overflow-auto">
      <form id={`create-${endpoint}-form`} onSubmit={handleSubmit} className="flex-1 space-y-2 overflow-y-auto px-2 pt-2">
        <div className="grid gap-2 sm:grid-cols-2">
          {allFields
            .filter((field) => !canViewField || canViewField(field.key))
            .map((field) => {
              const isEditable = !canEditField || canEditField(field.key);
              return (
                <div key={field.key}>
                  <Label className="flex items-center gap-1.5">
                    {field.label}
                    {!isEditable && <span className="text-muted-foreground text-xs font-normal">(view only)</span>}
                  </Label>
                  {field.type === 'select' ? (
                    <Select
                      value={String(form[field.key] ?? '')}
                      onValueChange={(value) => isEditable && setForm((prev) => ({ ...prev, [field.key]: value }))}
                      disabled={!isEditable}
                    >
                      <SelectTrigger disabled={!isEditable}>
                        <SelectValue placeholder={`Select ${field.label}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {(field.options ?? []).map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                      disabled={!isEditable}
                      placeholder={`Enter ${field.label ? field.label.toLowerCase() : field.key}`}
                      value={String(form[field.key] ?? '')}
                      onChange={(event) => isEditable && setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                      required={field.required}
                    />
                  )}
                </div>
              );
            })}
        </div>
      </form>
      
      <DialogFooter className="p-2 bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 mt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={createMutation.isPending}>Cancel</Button>
        <Button type="submit" form={`create-${endpoint}-form`} disabled={createMutation.isPending}>
          {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (!asFormOnly && <Plus className="h-4 w-4" />)}
          Add {title}
        </Button>
      </DialogFooter>
    </div>
  );
}
