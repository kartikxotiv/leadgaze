'use client';

import { useState } from 'react';
import type React from 'react';

import { useQuery } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
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

import {
  type ServiceCloudRecord,
  createServiceCloudResourceService,
  deleteServiceCloudResourceService,
  getServiceCloudResourceService,
  updateServiceCloudResourceService,
} from '../../services';

export type ResourceField = {
  key: string;
  label: string;
  type?: 'text' | 'email' | 'number' | 'textarea' | 'select';
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {toolbar}
          {canCreate ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>
                    {editing ? `Edit ${title}` : `New ${title}`}
                  </DialogTitle>
                </DialogHeader>
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
                  <Button onClick={save} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
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
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="text-muted-foreground py-8 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
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
                    <TableCell key={column.key}>
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
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(record)}
                          >
                            Edit
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
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ value }: { value?: string | null }) {
  return <Badge variant="secondary">{value || 'Unassigned'}</Badge>;
}
