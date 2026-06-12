'use client';

import { useState } from 'react';
import type React from 'react';

import { useQuery } from '@tanstack/react-query';
import { Edit2, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Skeleton } from '@kit/ui/skeleton';

import {
  type ServiceCloudRecord,
  createServiceCloudResourceService,
  deleteServiceCloudResourceService,
  getServiceCloudResourceService,
  updateServiceCloudResourceService,
} from '../../services';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { cn } from '@kit/ui/utils';

const PRESET_COLORS = [
  '#64748b', // Slate
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#14b8a6', // Teal
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#f43f5e', // Rose
];

export type ResourceField = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'color';
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
};

export type ResourceColumn = {
  key: string;
  label: string;
  render?: (record: ServiceCloudRecord) => React.ReactNode;
};

type ResourcePageProps = {
  workspaceId: string;
  resource: string;
  title: string;
  description: string;
  fields: ResourceField[];
  columns: ResourceColumn[];
  defaults?: ServiceCloudRecord;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  emptyLabel?: string;
  queryParams?: Record<string, string>;
  toolbar?: React.ReactNode;
};

function getInitialForm(
  fields: ResourceField[],
  defaults: ServiceCloudRecord = {},
) {
  return fields.reduce<ServiceCloudRecord>((acc, field) => {
    acc[field.key] = defaults[field.key] ?? '';
    return acc;
  }, {});
}

export function ServiceCloudResourcePage({
  workspaceId,
  resource,
  title,
  description,
  fields,
  columns,
  defaults = {},
  canCreate = true,
  canEdit = true,
  canDelete = true,
  emptyLabel = 'No records found.',
  queryParams = {},
  toolbar,
}: ResourcePageProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCloudRecord | null>(null);
  const [form, setForm] = useState<ServiceCloudRecord>(() =>
    getInitialForm(fields, defaults),
  );
  const [saving, setSaving] = useState(false);

  const {
    data = [],
    isLoading,
    refetch,
  } = useQuery<ServiceCloudRecord[]>({
    queryKey: ['service-cloud', resource, workspaceId, queryParams],
    queryFn: () =>
      getServiceCloudResourceService(resource, workspaceId, queryParams),
    enabled: Boolean(workspaceId),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(getInitialForm(fields, defaults));
    setOpen(true);
  };

  const openEdit = (record: ServiceCloudRecord) => {
    setEditing(record);
    setForm(getInitialForm(fields, { ...defaults, ...record }));
    setOpen(true);
  };

  const save = async () => {
    for (const field of fields) {
      if (field.required && !form[field.key]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { ...form, workspace_id: workspaceId };
      if (editing?.id) {
        await updateServiceCloudResourceService(resource, {
          ...payload,
          id: editing.id,
        });
      } else {
        await createServiceCloudResourceService(resource, payload);
      }
      toast.success(`${title} saved`);
      setOpen(false);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || `Failed to save ${title}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: ServiceCloudRecord) => {
    if (!record.id) return;
    try {
      await deleteServiceCloudResourceService(resource, workspaceId, record.id);
      toast.success(`${title} deleted`);
      await refetch();
    } catch (error: any) {
      toast.error(error.message || `Failed to delete ${title}`);
    }
  };

  return (
    <CardWidgetContainer className="mt-2" title="Email Accounts" desc="Connect Gmail or SMTP/IMAP accounts for Core email." icon2={<div className="flex items-center gap-2">
          {toolbar}
          {canCreate ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-[560px] dark:border-slate-800 dark:bg-slate-950">
                <div className="flex max-h-[90vh] flex-col">
                  <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
                    <DialogTitle>
                      {editing ? `Edit ${title}` : `New ${title}`}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 space-y-4 overflow-y-auto p-6 pb-8">
                    <div className="grid gap-4">
                  {fields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label>{field.label}</Label>
                      {field.type === 'select' ? (
                        <Select
                          value={String(form[field.key] ?? '')}
                          onValueChange={(value) =>
                            setForm((prev: ServiceCloudRecord) => ({
                              ...prev,
                              [field.key]: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={`Select ${field.label}`}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {(field.options ?? []).map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === 'color' ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className={cn(
                                  "h-8 w-8 rounded-full border-2 transition-all hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                  form[field.key] === color
                                    ? "border-primary scale-105 shadow-md ring-2 ring-primary"
                                    : "border-zinc-300 dark:border-zinc-700"
                                )}
                                style={{ backgroundColor: color }}
                                onClick={() =>
                                  setForm((prev: ServiceCloudRecord) => ({
                                    ...prev,
                                    [field.key]: color,
                                  }))
                                }
                                title={color}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative h-9 w-9 overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                              <input
                                type="color"
                                className="absolute -left-2 -top-2 h-14 w-14 cursor-pointer border-0 p-0"
                                value={String(form[field.key] || '#64748b')}
                                onChange={(event) =>
                                  setForm((prev: ServiceCloudRecord) => ({
                                    ...prev,
                                    [field.key]: event.target.value,
                                  }))
                                }
                              />
                            </div>
                            <Input
                              type="text"
                              placeholder="#000000"
                              value={String(form[field.key] ?? '')}
                              onChange={(event) =>
                                setForm((prev: ServiceCloudRecord) => ({
                                  ...prev,
                                  [field.key]: event.target.value,
                                }))
                              }
                              className="w-32 uppercase font-mono text-sm"
                            />
                          </div>
                        </div>
                      ) : (
                        <Input
                          type={
                            field.type === 'number'
                              ? 'number'
                              : field.type === 'email'
                                ? 'email'
                                : 'text'
                          }
                          value={String(form[field.key] ?? '')}
                          onChange={(event) =>
                            setForm((prev: ServiceCloudRecord) => ({
                              ...prev,
                              [field.key]:
                                field.type === 'number'
                                  ? Number(event.target.value)
                                  : event.target.value,
                            }))
                          }
                        />
                      )}
                    </div>
                  ))}
                    </div>
                  </div>
                  <div className="border-t border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex justify-end gap-3">
                      <Button onClick={save} disabled={saving}>
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>}>
        <div className='mb-2'>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.label}</TableHead>
              ))}
              {canEdit || canDelete ? (
                <TableHead className="text-right">Actions</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  <TableCell colSpan={columns.length} className="h-[52px] px-4 py-2">
                    <Skeleton className="h-7 w-full" />
                  </TableCell>
                  {canEdit || canDelete ? (
                    <TableCell className="bg-card px-4 text-right">
                      <Skeleton className="h-7 ml-auto w-full" />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-muted-foreground py-8 text-center"
                >
                  {emptyLabel}
                </TableCell>
              </TableRow>
            ) : (
              data.map((record) => (
                <TableRow key={record.id}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={cn(column.key === 'name' && 'primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary')}>
                      {column.render
                        ? column.render(record)
                        : String(record[column.key] ?? '-')}
                    </TableCell>
                  ))}
                  {canEdit || canDelete ? (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(record)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>                          
                        ) : null}
                        {canDelete ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(record)}
                          >
                            <Trash2 className="text-muted-foreground h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </CardWidgetContainer>
  );
}

export function StatusBadge({ value }: { value?: string | null }) {
  return <Badge variant="secondary">{value || 'Unassigned'}</Badge>;
}
