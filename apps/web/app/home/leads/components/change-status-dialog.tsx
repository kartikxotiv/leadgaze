'use client';

import React, { useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import { updateLeadService } from '~/services/leads.service';

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  leadId: string;
  currentStatusId: string;
  statuses: Array<{
    id: string;
    status_name: string;
    color: string;
  }>;
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  onSuccess,
  leadId,
  currentStatusId,
  statuses,
}: ChangeStatusDialogProps) {
  const [selectedStatusId, setSelectedStatusId] = useState(currentStatusId);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (selectedStatusId === currentStatusId) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateLeadService(leadId, { status_id: selectedStatusId });
      toast.success('Status updated successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>
            Select a new status for this lead.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Lead Status</Label>
            <Select
              value={selectedStatusId}
              onValueChange={setSelectedStatusId}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status.id} value={status.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      {status.status_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
