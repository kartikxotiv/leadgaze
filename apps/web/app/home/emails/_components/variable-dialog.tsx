'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { saveWorkspaceVariableService } from '~/services/email-templates.service';

interface VariableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variable: any;
  workspaceId: string;
}

export function VariableDialog({
  open,
  onOpenChange,
  variable,
  workspaceId,
}: VariableDialogProps) {
  const queryClient = useQueryClient();
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (variable) {
        setKey(variable.key);
        setValue(variable.value);
      } else {
        setKey('');
        setValue('');
      }
    }
  }, [open, variable]);

  const handleSave = async () => {
    if (!key || !value) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Ensure key is formatted correctly (e.g. company_name)
    const formattedKey = key.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    setIsSaving(true);
    try {
      await saveWorkspaceVariableService({
        id: variable?.id,
        workspace_id: workspaceId,
        key: formattedKey,
        value,
      });

      toast.success(variable ? 'Variable updated' : 'Variable created');
      queryClient.invalidateQueries({ queryKey: ['workspace-variables', workspaceId] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save variable');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col p-0 max-w-md">
        <DialogHeader>
          <DialogTitle>{variable ? 'Edit Variable' : 'Create New Variable'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-2 custom-spacing-x-y py-2">
          <div>
            <Label htmlFor="key">Variable Key</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{"{{"}</span>
              <Input
                id="key"
                placeholder="company_address"
                className="pl-8 pr-8"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{"}}"}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Used in templates as {"{{key}}"}. Only lowercase letters, numbers, and underscores allowed.
            </p>
          </div>

          <div>
            <Label htmlFor="value">Variable Value</Label>
            <Input
              id="value"
              placeholder="e.g., 123 Main St, New York, NY"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>

        
      <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Variable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
