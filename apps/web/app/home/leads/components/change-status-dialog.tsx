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

import { useRBAC } from '~/lib/rbac/rbac-provider';
import { calculateLeadScore } from '~/lib/lead-scoring/lead-scoring-engine';
import { updateLeadService } from '~/services/leads.service';
import { ManageableStatusSelect } from '../../_components/manageable-status-select';

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  lead: any;
  statuses: Array<{
    id: string;
    status_name: string;
    color: string;
    status_key: string;
  }>;
}

export function ChangeStatusDialog({
  open,
  onOpenChange,
  onSuccess,
  lead,
  statuses,
}: ChangeStatusDialogProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const [selectedStatusId, setSelectedStatusId] = useState(
    lead?.status_id || '',
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (selectedStatusId === lead?.status_id) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);
    try {
      // Find selected status to get its details if present in the passed statuses prop (fallback if not loaded yet)
      const selectedStatus = statuses.find((s) => s.id === selectedStatusId);

      // Calculate new lead score
      const { totalScore } = calculateLeadScore({
        first_name: lead.first_name,
        last_name: lead.last_name,
        company_name: lead.company_name,
        industry_id: lead.industry_id,
        company_size: lead.company_size,
        location: lead.location,
        timezone: lead.timezone,
        job_title: lead.job_title,
        status_key: selectedStatus?.status_key,
        status_name: selectedStatus?.status_name,
        contacted_count: lead.contacted_count || 0,
        custom_fields: lead.custom_fields || {},
      });

      console.log('Lead Scoring Debug:', {
        status_key: selectedStatus?.status_key,
        status_name: selectedStatus?.status_name,
        totalScore,
      });

      if (selectedStatus?.status_name) {
        toast.info(
          `Recalculated Score: ${totalScore} for ${selectedStatus?.status_name}`,
        );
      }

      await updateLeadService(lead.id, {
        status_id: selectedStatusId,
        lead_score: totalScore,
      });
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
      <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change Status</DialogTitle>
          <DialogDescription>
            Select a new status for this lead.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 px-6 py-4 flex-1 overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="status">Lead Status</Label>
            <div className="mt-1">
              <ManageableStatusSelect
                moduleKey="leads"
                workspaceId={workspace?.id ?? ''}
                value={selectedStatusId}
                onValueChange={setSelectedStatusId}
                disabled={isSaving}
              />
            </div>
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
