'use client';

import { useEffect, useRef, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Edit2,
  Info,
  LayoutTemplate,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import {
  deleteCoreEmailTemplateService,
  getCoreEmailTemplatesService,
  getCoreEmailVariablesService,
  saveCoreEmailTemplateService,
} from '../../services/email-templates.service';
import { ListToolBar } from '@kit/ui/list-toolbar';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useTableSort } from '@kit/ui/use-table-sort';
import { SortableTableHead } from '@kit/ui/sortable-table-head';
import { useLocalization } from '@kit/shared/localization';


export function CoreEmailTemplatesTab({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('core-email-templates-table');
  const { formatDate } = useLocalization();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['core-email-templates', workspaceId],
    queryFn: () => getCoreEmailTemplatesService(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const filteredTemplates = templates.filter(
    (template: any) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const { sortColumn, sortDirection, toggleSort, sortedData } = useTableSort<any>(
    'core-email-templates-table',
    filteredTemplates
  );

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteCoreEmailTemplateService(id, workspaceId);
      toast.success('Template deleted');
      await queryClient.invalidateQueries({
        queryKey: ['core-email-templates', workspaceId],
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete template');
    }
  };

  return (
    <div className="space-y-2">
      {/* Full-width search / filter / actions toolbar */}
              <div className="w-full max-w-full min-w-0 shrink-0 border-b">
                <ListToolBar
                  showSearch
                  searchPlaceholder="Search templates..."
                  searchValue={searchTerm}
                  onSearchChange={setSearchTerm}
                  actions={[
                    {
                      key: 'add',
                      label: 'New Template',
                      icon: Plus,
                      onClick: () => {setSelectedTemplate(null); setIsDialogOpen(true);},
                      show: true,
                      buttonVariant: 'default',
                    },
                  ]}                  
                />
              </div>
       <CustomTableContainer>      
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead
                  label="Name"
                  columnId="name"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  className="relative"
                  {...getHeaderProps('name')}
                >
                  <span className="col-resize-handle" {...getResizeHandleProps('name')} />
                </SortableTableHead>
                <SortableTableHead
                  label="Subject"
                  columnId="subject"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  sortable={false}
                  className="relative"
                  {...getHeaderProps('subject')}
                >
                  <span className="col-resize-handle" {...getResizeHandleProps('subject')} />
                </SortableTableHead>
                <SortableTableHead
                  label="Updated"
                  columnId="updated_at"
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  onSort={toggleSort}
                  className="relative"
                  {...getHeaderProps('updated_at')}
                >
                  <span className="col-resize-handle" {...getResizeHandleProps('updated_at')} />
                </SortableTableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-[52px] px-4 py-2" colSpan={3}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                    <TableCell className="bg-card px-4 text-right">
                      <Skeleton className="h-7 ml-auto w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="text-muted-foreground flex flex-col items-center gap-2">
                      <LayoutTemplate className="h-8 w-8 opacity-30" />
                      No templates found
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((template: any) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate">
                      {template.subject}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(template.updated_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => handleDelete(template.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CustomTableContainer>

      <CoreTemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        template={selectedTemplate}
        workspaceId={workspaceId}
      />
    </div>
  );
}

function CoreTemplateDialog({
  open,
  onOpenChange,
  template,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
  workspaceId: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const { data: customVariables = [] } = useQuery({
    queryKey: ['core-email-variables', workspaceId],
    queryFn: () => getCoreEmailVariablesService(workspaceId),
    enabled: Boolean(workspaceId) && open,
  });

  useEffect(() => {
    if (!open) return;

    setName(template?.name ?? '');
    setSubject(template?.subject ?? '');
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = template?.html_body ?? '';
      }
    }, 0);
  }, [open, template]);

  const insertVariable = (variable: string) => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, variable);
  };

  const handleSave = async () => {
    const htmlBody = editorRef.current?.innerHTML ?? '';

    if (!name || !subject || !htmlBody) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      await saveCoreEmailTemplateService({
        id: template?.id,
        workspace_id: workspaceId,
        name,
        subject,
        html_body: htmlBody,
        variables: customVariables.map(
          (variable: any) => `{{${variable.key}}}`,
        ),
      });
      toast.success(template ? 'Template updated' : 'Template created');
      await queryClient.invalidateQueries({
        queryKey: ['core-email-templates', workspaceId],
      });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-hidden border-gray-200 bg-white p-0 sm:max-w-3xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex max-h-[90vh] flex-col">
          <DialogHeader className="border-b border-gray-200 bg-white p-6 pb-4 dark:border-slate-800 dark:bg-slate-950">
            <DialogTitle>
              {template ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-8">
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {customVariables.length > 0 ? (
                customVariables.map((variable: any) => {
                  const value = `{{${variable.key}}}`;

                  return (
                    <Button
                      key={value}
                      variant="outline"
                      size="sm"
                      onClick={() => insertVariable(value)}
                    >
                      {variable.key}
                    </Button>
                  );
                })
              ) : (
                <span className="text-muted-foreground text-xs">
                  Add workspace variables to insert them here.
                </span>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="text-muted-foreground h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Variables are replaced before sending.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="overflow-hidden rounded-md border">
              <div className="border-b bg-zinc-50 p-1 dark:bg-zinc-800/50">
                {['bold', 'italic', 'underline'].map((command) => (
                  <Button
                    key={command}
                    variant="ghost"
                    size="sm"
                    onClick={() => document.execCommand(command, false)}
                  >
                    {command[0]!.toUpperCase()}
                  </Button>
                ))}
              </div>
              <div
                ref={editorRef}
                contentEditable
                className="min-h-[280px] bg-white p-4 text-sm outline-none dark:bg-zinc-950"
              />
            </div>
          </div>
          </div>
          <DialogFooter className="border-t border-gray-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
