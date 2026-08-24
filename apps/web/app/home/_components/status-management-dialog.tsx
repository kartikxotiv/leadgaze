'use client';

import { useEffect, useState } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
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
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import {
  createAccountTypeService,
  deleteAccountTypeService,
  updateAccountTypeService,
} from '~/services/accounts.service';
import {
  createLeadStatusService,
  deleteLeadStatusService,
  updateLeadStatusService,
} from '~/services/leads.service';
import {
  createOpportunityStageService,
  deleteOpportunityStageService,
  updateOpportunityStageService,
} from '~/services/opportunities.service';

export interface StatusItem {
  id: string;
  status_name: string;
  status_key: string;
  color: string;
  icon?: string;
  is_closed?: boolean;
  is_system?: boolean;
  is_default?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

export type StatusModuleKey = 'leads' | 'opportunities' | 'accounts';

interface StatusManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey: StatusModuleKey;
  workspaceId: string;
  /** When provided, dialog is in edit mode. Otherwise create mode. */
  existingStatus?: StatusItem | null;
  /** Called with the new or updated status after a successful save. */
  onSuccess: (status: StatusItem, action: 'create' | 'update' | 'delete') => void;
}

const STATUS_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#22c55e', label: 'Green' },
  { value: '#ef4444', label: 'Red' },
  { value: '#f97316', label: 'Orange' },
  { value: '#eab308', label: 'Yellow' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#6b7280', label: 'Gray' },
];

export function StatusManagementDialog({
  open,
  onOpenChange,
  moduleKey,
  workspaceId,
  existingStatus,
  onSuccess,
}: StatusManagementDialogProps) {
  const queryClient = useQueryClient();
  const isEditMode = !!existingStatus;

  const [statusName, setStatusName] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [isClosed, setIsClosed] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when dialog opens/status changes
  useEffect(() => {
    if (open) {
      setStatusName(existingStatus?.status_name ?? '');
      setColor(existingStatus?.color ?? '#3B82F6');
      setIsClosed(existingStatus?.is_closed ?? false);
      setShowDeleteConfirm(false);
    }
  }, [open, existingStatus]);

  const invalidate = () => {
    if (moduleKey === 'leads') {
      queryClient.invalidateQueries({ queryKey: ['lead-statuses', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['lead-statuses-mgmt', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
    } else if (moduleKey === 'opportunities') {
      queryClient.invalidateQueries({ queryKey: ['opportunity-stages', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-stages-mgmt', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity'] });
    } else {
      queryClient.invalidateQueries({ queryKey: ['account-types', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['account-types-mgmt', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
    }
  };

  // ── CREATE ──
  const createMutation = useMutation({
    mutationFn: () => {
      const payload = {
        workspace_id: workspaceId,
        status_name: statusName,
        color,
        is_closed: isClosed,
      };
      return moduleKey === 'leads'
        ? createLeadStatusService(payload)
        : moduleKey === 'opportunities'
          ? createOpportunityStageService(payload)
          : createAccountTypeService(payload);
    },
    onSuccess: (data: any) => {
      invalidate();
      toast.success(
        `${moduleKey === 'leads' ? 'Status' : moduleKey === 'opportunities' ? 'Stage' : 'Type'} created successfully`,
      );
      onSuccess(data, 'create');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create status');
    },
  });

  // ── UPDATE ──
  const updateMutation = useMutation({
    mutationFn: () => {
      const payload = { status_name: statusName, color, is_closed: isClosed };
      return moduleKey === 'leads'
        ? updateLeadStatusService(existingStatus!.id, payload)
        : moduleKey === 'opportunities'
          ? updateOpportunityStageService(existingStatus!.id, payload)
          : updateAccountTypeService(existingStatus!.id, payload);
    },
    onSuccess: (data: any) => {
      invalidate();
      toast.success(
        `${moduleKey === 'leads' ? 'Status' : moduleKey === 'opportunities' ? 'Stage' : 'Type'} updated successfully`,
      );
      onSuccess(data, 'update');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to update status');
    },
  });

  // ── DELETE ──
  const deleteMutation = useMutation({
    mutationFn: () =>
      moduleKey === 'leads'
        ? deleteLeadStatusService(existingStatus!.id)
        : moduleKey === 'opportunities'
          ? deleteOpportunityStageService(existingStatus!.id)
          : deleteAccountTypeService(existingStatus!.id),
    onSuccess: () => {
      invalidate();
      toast.success(
        `${moduleKey === 'leads' ? 'Status' : moduleKey === 'opportunities' ? 'Stage' : 'Type'} deleted successfully`,
      );
      onSuccess(existingStatus!, 'delete');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to delete status');
    },
  });

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const entityLabel = moduleKey === 'leads' ? 'Status' : moduleKey === 'opportunities' ? 'Stage' : 'Type';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusName.trim()) {
      toast.error(`${entityLabel} name is required`);
      return;
    }
    if (isEditMode) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? `Edit ${entityLabel}` : `New ${entityLabel}`}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? `Update the ${entityLabel.toLowerCase()} details`
              : `Create a new ${entityLabel.toLowerCase()} for this workspace`}
          </DialogDescription>
        </DialogHeader>

        <form id="status-form" onSubmit={handleSubmit}>
          <div className="space-y-2 px-6 py-0">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="status_name">
                {entityLabel} Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="status_name"
                placeholder={`e.g. ${moduleKey === 'leads' ? 'Qualified' : moduleKey === 'opportunities' ? 'Proposal Sent' : 'Distributor'}`}
                value={statusName}
                onChange={(e) => setStatusName(e.target.value)}
                disabled={isPending}
                autoFocus
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="status_color">Color</Label>
              <Select
                value={color}
                onValueChange={setColor}
                disabled={isPending}
              >
                <SelectTrigger id="status_color">
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {STATUS_COLORS.find((c) => c.value === color)?.label ??
                        color}
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {STATUS_COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: c.value }}
                        />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Is Closed */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <input
                  id="is_closed"
                  type="checkbox"
                  checked={isClosed}
                  onChange={(e) => setIsClosed(e.target.checked)}
                  disabled={isPending || existingStatus?.is_default}
                  className="h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                />
                <Label 
                  htmlFor="is_closed" 
                  className={existingStatus?.is_default ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}
                >
                  Mark as closed / terminal state
                </Label>
              </div>
              {existingStatus?.is_default && (
                <p className="text-[11px] text-muted-foreground ml-7">
                  The default status cannot be marked as closed.
                </p>
              )}
            </div>

            {/* Delete confirm section */}
            {isEditMode && existingStatus && (
              <div className="rounded-md border border-destructive/30 bg-[#FFDAD6] p-3">
                {existingStatus.is_system || existingStatus.is_default ? (
                  <div className="flex items-center gap-2 text-[#93000A] text-sm font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    Cannot delete {existingStatus.is_default ? 'default' : 'system'} status.
                  </div>
                ) : showDeleteConfirm ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      Are you sure? This cannot be undone.
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate()}
                        disabled={isPending}
                        className="gap-2"
                      >
                        {deleteMutation.isPending && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        Yes, Delete
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(false)}
                        disabled={isPending}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isPending}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2 h-auto p-0"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete this {entityLabel.toLowerCase()}
                  </Button>
                )}
              </div>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="status-form"
            disabled={isPending}
            className="gap-2"
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {isEditMode ? 'Save Changes' : `Create ${entityLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
