'use client';

import { useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, LayoutTemplate, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Skeleton } from '@kit/ui/skeleton';
import { formatDate } from '@kit/shared/utils';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  deleteEmailTemplateService,
  getEmailTemplatesService,
} from '~/services/email-templates.service';

import { TemplateDialog } from './template-dialog';
import { ListToolBar } from '@kit/ui/list-toolbar';
import CustomTableContainer from '@kit/ui/custom-table-container';

export function EmailTemplatesTab() {
  const queryClient = useQueryClient();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const canManage = canAccess('emails', 'manage_templates');

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['email-templates', workspace?.id],
    queryFn: () => getEmailTemplatesService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const filteredTemplates = templates.filter(
    (t: any) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteEmailTemplateService(id);
      toast.success('Template deleted successfully');
      queryClient.invalidateQueries({
        queryKey: ['email-templates', workspace?.id],
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete template');
    }
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsDialogOpen(true);
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
                      onClick: () => handleCreateTemplate(),
                      show: canManage,
                      buttonVariant: 'default',
                    },
                  ]}                  
                />
              </div>     

       <CustomTableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="w-[150px]">Last Updated</TableHead>
                {canManage && (
                  <TableHead className="w-[100px] text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTemplates ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="h-[52px] px-4 py-2" colSpan={3}>
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                    {canManage && (
                      <TableCell className="bg-card px-4 text-right">
                        <Skeleton className="h-7 ml-auto w-full" />
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : filteredTemplates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 4 : 3}
                    className="h-24 text-center"
                  >
                    <div className="text-muted-foreground flex flex-col items-center gap-2">
                      <LayoutTemplate className="h-8 w-8 opacity-20" />
                      <p>No templates found</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredTemplates.map((template: any) => (
                  <TableRow key={template.id} className="group">
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-md truncate">
                      {template.subject}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(template.updated_at)}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(template)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDelete(template.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
         
        </CustomTableContainer>
      

      <TemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        template={selectedTemplate}
        workspaceId={workspace?.id || ''}
      />
    </div>
  );
}
