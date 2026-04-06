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
  deleteWorkspaceVariableService,
  getWorkspaceVariablesService,
} from '~/services/email-templates.service';

import { VariableDialog } from './variable-dialog';

export function EmailVariablesTab() {
  const queryClient = useQueryClient();
  const { currentWorkspace: workspace, canAccess } = useRBAC();
  const [searchTerm, setSearchTerm] = useState('');
  const [isVariableDialogOpen, setIsVariableDialogOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<any>(null);

  const canManage = canAccess('emails', 'manage_variables');

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

  const handleDeleteVariable = async (id: number) => {
    if (!confirm('Are you sure you want to delete this variable?')) return;

    try {
      await deleteWorkspaceVariableService(id);
      toast.success('Variable deleted successfully');
      queryClient.invalidateQueries({
        queryKey: ['workspace-variables', workspace?.id],
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete variable');
    }
  };

  const handleCreateVariable = () => {
    setSelectedVariable(null);
    setIsVariableDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search variables..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {canManage && (
          <Button
            onClick={handleCreateVariable}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Variable
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Variable Key</TableHead>
                <TableHead>Value</TableHead>
                {canManage && (
                  <TableHead className="w-[100px] text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingVariables ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 3 : 2}
                    className="text-muted-foreground h-24 text-center"
                  >
                    Loading variables...
                  </TableCell>
                </TableRow>
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
                            onClick={() => handleDeleteVariable(variable.id)}
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

      <VariableDialog
        open={isVariableDialogOpen}
        onOpenChange={setIsVariableDialogOpen}
        variable={selectedVariable}
        workspaceId={workspace?.id || ''}
      />
    </div>
  );
}
