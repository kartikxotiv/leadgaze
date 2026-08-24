'use client';

import { useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, LayoutTemplate, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { Input } from '@kit/ui/input';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { Skeleton } from '@kit/ui/skeleton';
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
  deleteWorkspaceVariableService,
  getWorkspaceVariablesService,
} from '~/services/email-templates.service';
import { CustomDeleteDialog } from '@kit/ui/custom-delete-dialog';

import { VariableDialog } from './variable-dialog';

export function EmailVariablesTab() {
  const queryClient = useQueryClient();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [isVariableDialogOpen, setIsVariableDialogOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<any>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [variableToDelete, setVariableToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const canManage = canAccess('emails', 'manage_email');

  const { data: variables = [], isLoading: isLoadingVariables } = useQuery({
    queryKey: ['workspace-variables', workspace?.id],
    queryFn: () => getWorkspaceVariablesService(workspace?.id || ''),
    enabled: !!workspace?.id,
  });

  const filteredVariables = variables.filter(
    (v: any) =>
      v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.value.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleEditVariable = (variable: any) => {
    setSelectedVariable(variable);
    setIsVariableDialogOpen(true);
  };

  const handleDeleteClick = (id: number) => {
    setVariableToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const performDelete = async () => {
    if (!variableToDelete) return;
    setIsDeleting(true);
    try {
      await deleteWorkspaceVariableService(variableToDelete);
      toast.success('Variable deleted successfully');
      queryClient.invalidateQueries({
        queryKey: ['workspace-variables', workspace?.id],
      });
      setIsDeleteDialogOpen(false);
      setVariableToDelete(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete variable');
      setIsDeleteDialogOpen(false);
      setVariableToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateVariable = () => {
    setSelectedVariable(null);
    setIsVariableDialogOpen(true);
  };

  return (
    <div className="space-y-2">
      {/* Full-width search / filter / actions toolbar */}
      <div className="w-full max-w-full min-w-0 shrink-0 border-b">
        <ListToolBar
          showSearch
          searchPlaceholder="Search variables..."
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          actions={[
            {
              key: 'add',
              label: 'New Variable',
              icon: Plus,
              onClick: () => handleCreateVariable(),
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
              <TableHead className="w-[300px]">Variable Key</TableHead>
              <TableHead>Value</TableHead>
              {canManage && (
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingVariables ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell className="h-[32px] px-4 py-2" colSpan={2}>
                    <Skeleton className="h-7 w-full" />
                  </TableCell>
                  {canManage && (
                    <TableCell className="bg-card px-4 text-right">
                      <Skeleton className="ml-auto h-7 w-full" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : filteredVariables.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 3 : 2}
                  className="h-24 text-center"
                >
                  <div className="text-muted-foreground flex flex-col items-center gap-2">
                    <LayoutTemplate className="h-8 w-8 opacity-20" />
                    <p>No variables found</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredVariables.map((variable: any) => (
                <TableRow key={variable.id} className="group">
                  <TableCell>
                    <code className="text-primary dark:text-primary rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
                      {'{{'}
                      {variable.key}
                      {'}}'}
                    </code>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-lg truncate">
                    {variable.value}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditVariable(variable)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteClick(variable.id)}
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

      <VariableDialog
        open={isVariableDialogOpen}
        onOpenChange={setIsVariableDialogOpen}
        variable={selectedVariable}
        workspaceId={workspace?.id || ''}
      />
      
      <CustomDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Variable"
        description="Are you sure you want to delete this variable? This action cannot be undone."
        onConfirm={performDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
