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

import {
  deleteCoreEmailVariableService,
  getCoreEmailVariablesService,
  saveCoreEmailVariableService,
} from '../../services/email-templates.service';
import { ListToolBar } from '@kit/ui/list-toolbar';
import CustomTableContainer from '@kit/ui/custom-table-container';

export function CoreEmailVariablesTab({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVariable, setSelectedVariable] = useState<any>(null);

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
    <div className="space-y-4">
      {/* Full-width search / filter / actions toolbar */}
                          <div className="w-full max-w-full min-w-0 shrink-0 border-b pb-2">
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
                                  onClick: () => {setSelectedVariable(null); setIsDialogOpen(true);          },
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
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">Loading variables...</TableCell>
                    </TableRow>
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
                    filteredVariables.map((variable: any) => (
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
            </CustomTableContainer>

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{variable ? 'Edit Variable' : 'Create Variable'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
      </DialogContent>
    </Dialog>
  );
}
