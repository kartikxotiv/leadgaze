'use client';

import { useEffect, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ChevronDown, Loader2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

import {
  getAffectedAccountsForTypeService,
  reassignAccountTypeService,
} from '~/services/accounts.service';
import {
  getAffectedLeadsForStatusService,
  reassignLeadStatusService,
} from '~/services/leads.service';
import {
  getAffectedOpportunitiesForStageService,
  reassignOpportunityStageService,
} from '~/services/opportunities.service';

import { StatusItem, StatusModuleKey } from './status-management-dialog';

interface AffectedRecord {
  id: string;
  name: string;
  email?: string | null;
}

interface DisableStatusConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusToDisable: StatusItem;
  moduleKey: StatusModuleKey;
  workspaceId: string;
  /** All active statuses in the same module, excluding the one being disabled */
  availableStatuses: StatusItem[];
  /** Called after successful reassign + disable */
  onSuccess: () => void;
}

export function DisableStatusConfirmationDialog({
  open,
  onOpenChange,
  statusToDisable,
  moduleKey,
  workspaceId,
  availableStatuses,
  onSuccess,
}: DisableStatusConfirmationDialogProps) {
  const [selectedNewStatusId, setSelectedNewStatusId] = useState<string>('');
  const [records, setRecords] = useState<AffectedRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);

  const entityLabel =
    moduleKey === 'leads'
      ? 'Status'
      : moduleKey === 'opportunities'
        ? 'Stage'
        : 'Type';
  const recordLabel =
    moduleKey === 'leads'
      ? 'leads'
      : moduleKey === 'opportunities'
        ? 'opportunities'
        : 'accounts';

  // Load initial 10 records when dialog opens
  useEffect(() => {
    if (!open || !statusToDisable?.id) return;

    setSelectedNewStatusId('');
    setAllLoaded(false);
    setLoadingRecords(true);

    const fetchInitial = async () => {
      try {
        let result: { total_count: number; records: AffectedRecord[] } | null = null;

        if (moduleKey === 'leads') {
          result = await getAffectedLeadsForStatusService({
            statusId: statusToDisable.id,
            workspaceId,
            limit: 10,
            offset: 0,
          }) as { total_count: number; records: AffectedRecord[] };
        } else if (moduleKey === 'opportunities') {
          result = await getAffectedOpportunitiesForStageService({
            stageId: statusToDisable.id,
            workspaceId,
            limit: 10,
            offset: 0,
          }) as { total_count: number; records: AffectedRecord[] };
        } else {
          result = await getAffectedAccountsForTypeService({
            typeId: statusToDisable.id,
            workspaceId,
            limit: 10,
            offset: 0,
          }) as { total_count: number; records: AffectedRecord[] };
        }

        if (result) {
          setRecords(result.records || []);
          setTotalCount(result.total_count ?? 0);
          if ((result.total_count ?? 0) <= 10) {
            setAllLoaded(true);
          }
        }
      } catch {
        toast.error('Failed to load affected records');
      } finally {
        setLoadingRecords(false);
      }
    };

    void fetchInitial();
  }, [open, statusToDisable?.id, moduleKey, workspaceId]);

  // Load all remaining records
  const handleLoadAll = async () => {
    setLoadingAll(true);
    try {
      let result: { total_count: number; records: AffectedRecord[] } | null = null;

      if (moduleKey === 'leads') {
        result = await getAffectedLeadsForStatusService({
          statusId: statusToDisable.id,
          workspaceId,
          limit: totalCount,
          offset: 0,
        }) as { total_count: number; records: AffectedRecord[] };
      } else if (moduleKey === 'opportunities') {
        result = await getAffectedOpportunitiesForStageService({
          stageId: statusToDisable.id,
          workspaceId,
          limit: totalCount,
          offset: 0,
        }) as { total_count: number; records: AffectedRecord[] };
      } else {
        result = await getAffectedAccountsForTypeService({
          typeId: statusToDisable.id,
          workspaceId,
          limit: totalCount,
          offset: 0,
        }) as { total_count: number; records: AffectedRecord[] };
      }

      if (result) {
        setRecords(result.records || []);
        setAllLoaded(true);
      }
    } catch {
      toast.error('Failed to load all records');
    } finally {
      setLoadingAll(false);
    }
  };

  // Reassign + disable mutation
  const reassignMutation = useMutation({
    mutationFn: async () => {
      if (moduleKey === 'leads') {
        return reassignLeadStatusService({
          statusId: statusToDisable.id,
          new_status_id: selectedNewStatusId,
          workspace_id: workspaceId,
        });
      } else if (moduleKey === 'opportunities') {
        return reassignOpportunityStageService({
          stageId: statusToDisable.id,
          new_status_id: selectedNewStatusId,
          workspace_id: workspaceId,
        });
      } else {
        return reassignAccountTypeService({
          typeId: statusToDisable.id,
          new_status_id: selectedNewStatusId,
          workspace_id: workspaceId,
        });
      }
    },
    onSuccess: (result: any) => {
      const newStatusName = availableStatuses.find(
        (s) => s.id === selectedNewStatusId,
      )?.status_name ?? 'selected status';
      const count = result?.reassigned_count ?? totalCount;

      toast.success(
        `Moved ${count} ${recordLabel} to "${newStatusName}" and disabled "${statusToDisable.status_name}"`,
      );
      onSuccess();
      onOpenChange(false);
    },
    onError: () => {
      toast.error(`Failed to reassign ${recordLabel}`);
    },
  });

  const remainingCount = totalCount - records.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 flex flex-col max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Disable &ldquo;{statusToDisable.status_name}&rdquo;?</DialogTitle>
          </div>
          <DialogDescription>
            This {entityLabel.toLowerCase()} is used by{' '}
            <strong>{totalCount} {recordLabel}</strong>. You must reassign them
            to another active {entityLabel.toLowerCase()} before disabling.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Global reassign dropdown */}
          <div className="space-y-2">
            <p className="text-sm font-medium">
              Move all {totalCount} {recordLabel} to:
            </p>
            <Select
              value={selectedNewStatusId}
              onValueChange={setSelectedNewStatusId}
              disabled={reassignMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select a ${entityLabel.toLowerCase()}...`}>
                  {selectedNewStatusId && (
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            availableStatuses.find((s) => s.id === selectedNewStatusId)
                              ?.color ?? '#ccc',
                        }}
                      />
                      <span>
                        {availableStatuses.find((s) => s.id === selectedNewStatusId)
                          ?.status_name}
                      </span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <span>{s.status_name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Affected records list */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Affected Records ({totalCount} total)
            </p>

            {loadingRecords ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : records.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No records found.</p>
            ) : (
              <div className="rounded-md border divide-y bg-background max-h-48 overflow-y-auto">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between px-3 py-2.5"
                  >
                    <span className="text-sm font-medium truncate">{record.name}</span>
                    {record.email && (
                      <span className="text-xs text-muted-foreground ml-2 shrink-0 truncate max-w-[180px]">
                        {record.email}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Load all button */}
            {!allLoaded && remainingCount > 0 && !loadingRecords && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadAll}
                disabled={loadingAll}
                className="w-full gap-2 text-muted-foreground hover:text-foreground border border-dashed"
              >
                {loadingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
                Load all {remainingCount} remaining {recordLabel}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reassignMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => reassignMutation.mutate()}
            disabled={!selectedNewStatusId || reassignMutation.isPending}
            className="gap-2"
          >
            {reassignMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Reassign & Disable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
