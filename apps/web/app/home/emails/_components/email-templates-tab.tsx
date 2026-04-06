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

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
  deleteEmailTemplateService,
  getEmailTemplatesService,
} from '~/services/email-templates.service';

import { TemplateDialog } from './template-dialog';

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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search templates..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {canManage && (
          <Button
            onClick={handleCreateTemplate}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
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
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 4 : 3}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Loading templates...
                  </TableCell>
                </TableRow>
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
                      {new Date(template.updated_at).toLocaleDateString()}
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
        </CardContent>
      </Card>

      <TemplateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        template={selectedTemplate}
        workspaceId={workspace?.id || ''}
      />
    </div>
  );
}
