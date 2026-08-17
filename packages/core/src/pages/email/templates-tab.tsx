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
import { RichTextEditor, type RichTextEditorRef } from '@kit/ui/rich-text-editor';
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
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
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
    <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col space-y-2">
      <CardWidgetContainer headerClassName="p-2 xl:p-2 2xl:p-2" title="Templates" icon2={
          <Button
            className="bg-leadgaze-primary hover:bg-leadgaze-primary text-white secondary-text-small-bold gap-1.5 px-2"
            onClick={() => {setSelectedTemplate(null); setIsDialogOpen(true);}}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
      }>
          <div className="mb-2">
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
                    <TableCell className="h-[32px] px-4 py-2" colSpan={3}>
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
        </div>
      </CardWidgetContainer>

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
  const [htmlBody, setHtmlBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<RichTextEditorRef>(null);
  const { data: customVariables = [] } = useQuery({
    queryKey: ['core-email-variables', workspaceId],
    queryFn: () => getCoreEmailVariablesService(workspaceId),
    enabled: Boolean(workspaceId) && open,
  });

  useEffect(() => {
    if (!open) return;

    setName(template?.name ?? '');
    setSubject(template?.subject ?? '');
    setHtmlBody(template?.html_body ?? '');
    setTimeout(() => {
      editorRef.current?.setHTML(template?.html_body ?? '');
    }, 0);
  }, [open, template]);

  const insertVariable = (variable: string) => {
    if (editorRef.current) {
      editorRef.current.insertText(variable);
    }
  };

  const handleSave = async () => {
    const content = editorRef.current?.getHTML() || htmlBody;

    if (!name || !subject || !content.trim()) {
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
        html_body: content,
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
          <DialogHeader>
            <DialogTitle>
              {template ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="space-y-1.5">
              <Label>Template Name</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g., Intro Outreach"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g., Hello {{first_name}}!"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Template Body</Label>
                {customVariables.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-muted-foreground">Insert:</span>
                    {customVariables.map((variable: any) => {
                      const value = `{{${variable.key}}}`;
                      return (
                        <Button
                          key={value}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-6 text-[10px] px-2 bg-emerald-50/50 border-emerald-100 hover:bg-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/20"
                          onClick={() => insertVariable(value)}
                        >
                          {variable.key}
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>
              <RichTextEditor
                ref={editorRef}
                value={htmlBody}
                onChange={setHtmlBody}
                minHeight="16rem"
                placeholder="Write your email template here..."
                toolbarExtra={
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-pointer">
                          <Info className="h-3.5 w-3.5 text-zinc-400" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Variables are replaced before sending.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                }
              />
            </div>
          </div>
          <DialogFooter className="px-6 py-3 border-t">
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
              Save Template
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
