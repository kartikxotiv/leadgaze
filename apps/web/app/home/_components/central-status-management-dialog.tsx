'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Loader2, Plus, Settings, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import {
  getAffectedAccountsForTypeService,
  getAccountTypesService,
  updateAccountTypeService,
} from '~/services/accounts.service';
import {
  getAffectedLeadsForStatusService,
  getLeadStatusesService,
  updateLeadStatusService,
} from '~/services/leads.service';
import {
  getAffectedOpportunitiesForStageService,
  getOpportunityStatusesService,
  updateOpportunityStageService,
} from '~/services/opportunities.service';

import { DisableStatusConfirmationDialog } from './disable-status-confirmation-dialog';
import {
  StatusItem,
  StatusManagementDialog,
  StatusModuleKey,
} from './status-management-dialog';

interface CentralStatusManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initialTab?: StatusModuleKey;
}

export function CentralStatusManagementDialog({
  open,
  onOpenChange,
  workspaceId,
  initialTab = 'leads',
}: CentralStatusManagementDialogProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<StatusModuleKey>(initialTab);
  const [mgmtOpen, setMgmtOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusItem | null>(null);
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null);

  // Disable confirmation modal state
  const [disableModalOpen, setDisableModalOpen] = useState(false);
  const [statusToDisable, setStatusToDisable] = useState<StatusItem | null>(null);

  // Fetch ALL statuses (including inactive) for the management dialog
  const { data: leadStatuses = [], refetch: refetchLeads } = useQuery<StatusItem[]>({
    queryKey: ['lead-statuses-mgmt', workspaceId],
    queryFn: () =>
      getLeadStatusesService({ workspaceId, includeInactive: true }) as Promise<StatusItem[]>,
    enabled: !!workspaceId && open,
  });

  const { data: opportunityStages = [], refetch: refetchOpportunities } = useQuery<StatusItem[]>({
    queryKey: ['opportunity-stages-mgmt', workspaceId],
    queryFn: () =>
      getOpportunityStatusesService({ workspaceId, includeInactive: true }) as Promise<StatusItem[]>,
    enabled: !!workspaceId && open,
  });

  const { data: accountTypes = [], refetch: refetchAccountTypes } = useQuery<StatusItem[]>({
    queryKey: ['account-types-mgmt', workspaceId],
    queryFn: () =>
      getAccountTypesService({ workspaceId, includeInactive: true }) as Promise<StatusItem[]>,
    enabled: !!workspaceId && open,
  });

  const getActiveTabData = () => {
    if (activeTab === 'leads') return leadStatuses;
    if (activeTab === 'opportunities') return opportunityStages;
    return accountTypes;
  };

  const refetchActiveTab = () => {
    if (activeTab === 'leads') {
      refetchLeads();
      // Also invalidate the regular (non-mgmt) cache so dropdowns update
      queryClient.invalidateQueries({ queryKey: ['lead-statuses', workspaceId] });
    } else if (activeTab === 'opportunities') {
      refetchOpportunities();
      queryClient.invalidateQueries({ queryKey: ['opportunity-stages', workspaceId] });
    } else {
      refetchAccountTypes();
      queryClient.invalidateQueries({ queryKey: ['account-types', workspaceId] });
    }
  };

  const openCreate = () => {
    setEditingStatus(null);
    setMgmtOpen(true);
  };

  const openEdit = (status: StatusItem) => {
    setEditingStatus(status);
    setMgmtOpen(true);
  };

  const handleSuccess = (_status: StatusItem, _action: 'create' | 'update' | 'delete') => {
    refetchActiveTab();
  };

  // Simple enable/disable toggle (for when there are 0 affected records or enabling)
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (activeTab === 'leads') return updateLeadStatusService(id, { is_active });
      if (activeTab === 'opportunities') return updateOpportunityStageService(id, { is_active });
      return updateAccountTypeService(id, { is_active });
    },
    onSuccess: (_data, variables) => {
      refetchActiveTab();
      const label =
        activeTab === 'leads' ? 'Status' : activeTab === 'opportunities' ? 'Stage' : 'Type';
      toast.success(
        variables.is_active
          ? `${label} enabled successfully`
          : `${label} disabled successfully`,
      );
    },
    onError: () => {
      toast.error('Failed to update status');
    },
  });

  // Handle clicking the toggle icon
  const handleToggleActive = async (status: StatusItem) => {
    setPendingStatusId(status.id);

    // Enabling — no confirmation needed
    if (!status.is_active) {
      toggleActiveMutation.mutate(
        { id: status.id, is_active: true },
        { onSettled: () => setPendingStatusId(null) }
      );
      return;
    }

    // Disabling — check for affected records first
    try {
      let result: { total_count: number; records: unknown[] } | null = null;

      if (activeTab === 'leads') {
        result = await getAffectedLeadsForStatusService({
          statusId: status.id,
          workspaceId,
          limit: 1,
          offset: 0,
        }) as { total_count: number; records: unknown[] };
      } else if (activeTab === 'opportunities') {
        result = await getAffectedOpportunitiesForStageService({
          stageId: status.id,
          workspaceId,
          limit: 1,
          offset: 0,
        }) as { total_count: number; records: unknown[] };
      } else {
        result = await getAffectedAccountsForTypeService({
          typeId: status.id,
          workspaceId,
          limit: 1,
          offset: 0,
        }) as { total_count: number; records: unknown[] };
      }

      if ((result?.total_count ?? 0) === 0) {
        // No affected records — disable immediately
        toggleActiveMutation.mutate(
          { id: status.id, is_active: false },
          { onSettled: () => setPendingStatusId(null) }
        );
      } else {
        // Open the pre-disable confirmation modal
        setStatusToDisable(status);
        setDisableModalOpen(true);
        setPendingStatusId(null);
      }
    } catch {
      toast.error('Failed to check affected records');
      setPendingStatusId(null);
    }
  };

  const addLabel =
    activeTab === 'leads' ? 'Status' : activeTab === 'opportunities' ? 'Stage' : 'Type';

  // Available statuses for the reassign dropdown (other active ones in the same tab)
  const availableForReassign = getActiveTabData().filter(
    (s) => s.is_active && s.id !== statusToDisable?.id,
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="p-0 sm:max-w-[620px] flex flex-col max-h-[620px] gap-0 pb-1">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <DialogTitle>Manage Workspace Statuses</DialogTitle>
            </div>
            <DialogDescription>
              Configure pipeline stages for Leads, Opportunities, and Account Types.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as StatusModuleKey)}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div className="border-b px-6 flex items-center justify-between py-3 shrink-0">
              <TabsList className="grid grid-cols-3 w-[400px]">
                <TabsTrigger value="leads">Leads</TabsTrigger>
                <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
                <TabsTrigger value="accounts">Account Types</TabsTrigger>
              </TabsList>

              <Button size="sm" onClick={openCreate} className="gap-1 bg-[#0b57d0] text-white hover:bg-[#0b57d0]/90 dark:bg-[#0b57d0] dark:hover:bg-[#0b57d0]/90">
                <Plus className="h-4 w-4" />
                Add Status
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="leads" className="m-0">
                <StatusList
                  statuses={leadStatuses}
                  onEdit={openEdit}
                  onToggleActive={handleToggleActive}
                  pendingStatusId={pendingStatusId}
                  entityLabel="Status"
                />
              </TabsContent>

              <TabsContent value="opportunities" className="m-0">
                <StatusList
                  statuses={opportunityStages}
                  onEdit={openEdit}
                  onToggleActive={handleToggleActive}
                  pendingStatusId={pendingStatusId}
                  entityLabel="Stage"
                />
              </TabsContent>

              <TabsContent value="accounts" className="m-0">
                <StatusList
                  statuses={accountTypes}
                  onEdit={openEdit}
                  onToggleActive={handleToggleActive}
                  pendingStatusId={pendingStatusId}
                  entityLabel="Type"
                />
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Child StatusManagementDialog for create/edit/delete operations */}
      <StatusManagementDialog
        open={mgmtOpen}
        onOpenChange={setMgmtOpen}
        moduleKey={activeTab}
        workspaceId={workspaceId}
        existingStatus={editingStatus}
        onSuccess={handleSuccess}
      />

      {/* Pre-disable confirmation modal */}
      {statusToDisable && (
        <DisableStatusConfirmationDialog
          open={disableModalOpen}
          onOpenChange={setDisableModalOpen}
          statusToDisable={statusToDisable}
          moduleKey={activeTab}
          workspaceId={workspaceId}
          availableStatuses={availableForReassign}
          onSuccess={refetchActiveTab}
        />
      )}
    </>
  );
}

interface StatusListProps {
  statuses: StatusItem[];
  onEdit: (status: StatusItem) => void;
  onToggleActive: (status: StatusItem) => void;
  pendingStatusId: string | null;
  entityLabel: string;
}

function StatusList({
  statuses,
  onEdit,
  onToggleActive,
  pendingStatusId,
  entityLabel,
}: StatusListProps) {
  if (statuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p className="text-sm">No custom {entityLabel.toLowerCase()}s defined.</p>
      </div>
    );
  }

  return (
    <div className="divide-y bg-background">
      {statuses.map((status) => {
        // Only default statuses cannot be toggled
        const isToggleable = !status.is_default;
        const isCurrentToggling = pendingStatusId === status.id;
        const isAnyToggling = pendingStatusId !== null;

        return (
          <div
            key={status.id}
            className="flex items-center justify-between px-6 py-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors group"
          >
            <div className="flex items-center flex-1">
              <div className="flex items-center gap-3 w-[240px] shrink-0">
                <div
                  className={`h-2.5 w-2.5 rounded-full shrink-0 ${!status.is_active ? 'opacity-40' : ''}`}
                  style={{ backgroundColor: status.color }}
                />
                <p className={`text-sm primary-text-medium ${!status.is_active ? 'text-muted-foreground line-through' : ''}`}>
                  {status.status_name}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {status.is_system && (
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    System
                  </span>
                )}
                {status.is_default && (
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Default
                  </span>
                )}
                {status.is_closed && (
                  <span className="text-[10px] font-semibold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Closed
                  </span>
                )}
                {!status.is_active && (
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Disabled
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          if (isToggleable) {
                            onToggleActive(status);
                          }
                        }}
                        disabled={isAnyToggling || !isToggleable}
                      >
                        {isCurrentToggling ? (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : status.is_active ? (
                          <Eye className={isToggleable ? "h-5 w-5 text-muted-foreground" : "h-5 w-5 text-muted-foreground opacity-50"} />
                        ) : (
                          <EyeOff className="h-5 w-5 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {!isToggleable 
                      ? 'Cannot disable default status'
                      : status.is_active 
                        ? 'Click to hide/disable' 
                        : 'Click to show/enable'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Edit button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => onEdit(status)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
