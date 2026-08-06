'use client';

import { useEffect, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Loader2, Plus, Save, Search, Trash2, Variable } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
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
  deleteCoreEmailVariableService,
  getCoreEmailVariablesService,
  saveCoreEmailVariableService,
} from '../../services/email-templates.service';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';

export function CoreEmailVariablesTab({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<any>(null);

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('core-email-variables-table');

  const { data: variables = [], isLoading } = useQuery({
    queryKey: ['core-email-variables', workspaceId],
    queryFn: () => getCoreEmailVariablesService(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const filteredVariables = variables.filter(
    (variable: any) =>
      variable.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      variable.value.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<any>(
    'core-email-variables-table',
    filteredVariables
  );

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this variable?')) return;

    try {
      await deleteCoreEmailVariableService(id, workspaceId);
      toast.success('Variable deleted');
      await queryClient.invalidateQueries({ queryKey: ['core-email-variables', workspaceId] });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete variable');
    }
  };

  return (
    <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col space-y-2">
      <CardWidgetContainer title="Variables" icon2={
          <Button
            className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2"
            onClick={() => {setSelectedVariable(null); setIsDialogOpen(true);}}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
      }>
          <div className="mb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead
                      label="Key"
                      columnId="key"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('key')}
                    >
                      <span className="col-resize-handle" {...getResizeHandleProps('key')} />
                    </SortableTableHead>
                    <SortableTableHead
                      label="Value"
                      columnId="value"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('value')}
                    >
                      <span className="col-resize-handle" {...getResizeHandleProps('value')} />
                    </SortableTableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell className="h-[32px] px-4 py-2" colSpan={2}>
                          <Skeleton className="h-7 w-full" />
                        </TableCell>
                        <TableCell className="bg-card px-4 text-right">
                          <Skeleton className="h-7 ml-auto w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredVariables.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        <div className="text-muted-foreground flex flex-col items-center gap-2">
                          <Variable className="h-8 w-8 opacity-30" />
                          No variables found
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedData.map((variable: any) => (
                      <TableRow key={variable.id}>
                        <TableCell>
                          <code className="bg-muted text-primary rounded px-1.5 py-0.5 text-xs">{`{{${variable.key}}}`}</code>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-lg truncate">{variable.value}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedVariable(variable);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(variable.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardWidgetContainer>

      <CoreVariableDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} variable={selectedVariable} workspaceId={workspaceId} />
    </div>
  );
}

function CoreVariableDialog({
  open,
  onOpenChange,
  variable,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variable: any;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(variable?.key ?? '');
      setValue(variable?.value ?? '');
    }
  }, [open, variable]);

  const handleSave = async () => {
    const formattedKey = key.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    if (!formattedKey || !value) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      await saveCoreEmailVariableService({
        id: variable?.id,
        workspace_id: workspaceId,
        key: formattedKey,
        value,
      });
      toast.success(variable ? 'Variable updated' : 'Variable created');
      await queryClient.invalidateQueries({ queryKey: ['core-email-variables', workspaceId] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save variable');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-md dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader>
            <DialogTitle>{variable ? 'Edit Variable' : 'Create Variable'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-2 overflow-y-auto p-6 pb-8">
          <div className="space-y-2">
            <Label>Variable Key</Label>
            <Input value={key} onChange={(event) => setKey(event.target.value)} placeholder="company_address" />
          </div>
          <div className="space-y-2">
            <Label>Value</Label>
            <Input value={value} onChange={(event) => setValue(event.target.value)} placeholder="123 Main St" />
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
