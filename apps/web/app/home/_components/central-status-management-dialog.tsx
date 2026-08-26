'use client';

import { useEffect, useState } from 'react';

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, GripVertical, Loader2, Plus, Settings, Eye, EyeOff } from 'lucide-react';
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
  reorderAccountTypesService,
} from '~/services/accounts.service';
import {
  getAffectedLeadsForStatusService,
  getLeadStatusesService,
  updateLeadStatusService,
  reorderLeadStatusesService,
} from '~/services/leads.service';
import {
  getAffectedOpportunitiesForStageService,
  getOpportunityStatusesService,
  updateOpportunityStageService,
  reorderOpportunityStagesService,
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

  // Local ordered state for each tab (for optimistic DnD)
  const [leadOrder, setLeadOrder] = useState<StatusItem[]>([]);
  const [opportunityOrder, setOpportunityOrder] = useState<StatusItem[]>([]);
  const [accountOrder, setAccountOrder] = useState<StatusItem[]>([]);

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

  // Derive stable string keys so the effects only fire when data actually changes,
  // not on every render when React Query returns a new array reference.
  const leadStatusesKey = leadStatuses.map((s) => `${s.id}:${s.sort_order}:${s.is_active}:${s.status_name}:${s.color}:${s.is_closed}`).join(',');
  const opportunityStagesKey = opportunityStages.map((s) => `${s.id}:${s.sort_order}:${s.is_active}:${s.status_name}:${s.color}:${s.is_closed}`).join(',');
  const accountTypesKey = accountTypes.map((s) => `${s.id}:${s.sort_order}:${s.is_active}:${s.status_name}:${s.color}:${s.is_closed}`).join(',');

  // Sync fetched data into local ordered state (only when actual data changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLeadOrder(leadStatuses); }, [leadStatusesKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setOpportunityOrder(opportunityStages); }, [opportunityStagesKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setAccountOrder(accountTypes); }, [accountTypesKey]);

  const getActiveTabData = () => {
    if (activeTab === 'leads') return leadOrder;
    if (activeTab === 'opportunities') return opportunityOrder;
    return accountOrder;
  };

  const setActiveTabData = (items: StatusItem[]) => {
    if (activeTab === 'leads') setLeadOrder(items);
    else if (activeTab === 'opportunities') setOpportunityOrder(items);
    else setAccountOrder(items);
  };

  const refetchActiveTab = () => {
    if (activeTab === 'leads') {
      refetchLeads();
      queryClient.invalidateQueries({ queryKey: ['lead-statuses', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['lead-statuses-mgmt', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
    } else if (activeTab === 'opportunities') {
      refetchOpportunities();
      queryClient.invalidateQueries({ queryKey: ['opportunity-stages', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['opportunity-stages-mgmt', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities-kanban'] });
      queryClient.invalidateQueries({ queryKey: ['opportunity'] });
    } else {
      refetchAccountTypes();
      queryClient.invalidateQueries({ queryKey: ['account-types', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['account-types-mgmt', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account'] });
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

  // Simple enable/disable toggle
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

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: ({
      tab,
      orderedStatusIds,
    }: {
      tab: StatusModuleKey;
      orderedStatusIds: string[];
    }) => {
      if (tab === 'leads')
        return reorderLeadStatusesService({ workspaceId, orderedStatusIds }) as Promise<unknown>;
      if (tab === 'opportunities')
        return reorderOpportunityStagesService({ workspaceId, orderedStatusIds }) as Promise<unknown>;
      return reorderAccountTypesService({ workspaceId, orderedStatusIds }) as Promise<unknown>;
    },
    onSuccess: (_data, variables) => {
      // Invalidate both mgmt and standard status queries so both management dialog and dropdowns/kanban update immediately
      if (variables.tab === 'leads') {
        queryClient.invalidateQueries({ queryKey: ['lead-statuses-mgmt', workspaceId] });
        queryClient.invalidateQueries({ queryKey: ['lead-statuses', workspaceId] });
      } else if (variables.tab === 'opportunities') {
        queryClient.invalidateQueries({ queryKey: ['opportunity-stages-mgmt', workspaceId] });
        queryClient.invalidateQueries({ queryKey: ['opportunity-stages', workspaceId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['account-types-mgmt', workspaceId] });
        queryClient.invalidateQueries({ queryKey: ['account-types', workspaceId] });
      }
    },
    onError: () => {
      toast.error('Failed to save order. Reverting...');
      // Revert by re-syncing from server data
      setLeadOrder(leadStatuses);
      setOpportunityOrder(opportunityStages);
      setAccountOrder(accountTypes);
    },
  });

  // Handle clicking the toggle icon
  const handleToggleActive = async (status: StatusItem) => {
    setPendingStatusId(status.id);

    // Enabling — no confirmation needed
    if (!status.is_active) {
      toggleActiveMutation.mutate(
        { id: status.id, is_active: true },
        { onSettled: () => setPendingStatusId(null) },
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
          { onSettled: () => setPendingStatusId(null) },
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

  // DnD sensors
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const currentItems = getActiveTabData();
    const oldIndex = currentItems.findIndex((s) => s.id === active.id);
    const newIndex = currentItems.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(currentItems, oldIndex, newIndex);
    // Optimistic update — immediate visual feedback
    setActiveTabData(reordered);

    // Persist to database
    reorderMutation.mutate({
      tab: activeTab,
      orderedStatusIds: reordered.map((s) => s.id),
    });
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
              <Settings className="h-5 w-5 text-white" />
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
            <div className="border-b flex items-center justify-between shrink-0 custom-spacing-x-y py-2">
              <TabsList className="h-auto justify-start gap-6 rounded-none bg-transparent p-0">
                <TabsTrigger value="leads" className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:bg-transparent h-auto">Leads</TabsTrigger>
                <TabsTrigger value="opportunities" className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:bg-transparent h-auto">Opportunities</TabsTrigger>
                <TabsTrigger value="accounts" className="data-[state=active]:border-primary rounded-none border-b-2 border-transparent px-0 py-3 data-[state=active]:bg-transparent h-auto">Account Types</TabsTrigger>
              </TabsList>

              <Button onClick={openCreate} className="secondary-text-small-bold bg-leadgaze-primary hover:bg-leadgaze-primary text-white gap-1.5 px-2">
                <Plus className="h-4 w-4" />
                Add {addLabel}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="leads" className="m-0">
                <DndStatusList
                  statuses={leadOrder}
                  onEdit={openEdit}
                  onToggleActive={handleToggleActive}
                  pendingStatusId={pendingStatusId}
                  entityLabel="Status"
                  sensors={sensors}
                  onDragEnd={handleDragEnd}
                />
              </TabsContent>

              <TabsContent value="opportunities" className="m-0">
                <DndStatusList
                  statuses={opportunityOrder}
                  onEdit={openEdit}
                  onToggleActive={handleToggleActive}
                  pendingStatusId={pendingStatusId}
                  entityLabel="Stage"
                  sensors={sensors}
                  onDragEnd={handleDragEnd}
                />
              </TabsContent>

              <TabsContent value="accounts" className="m-0">
                <DndStatusList
                  statuses={accountOrder}
                  onEdit={openEdit}
                  onToggleActive={handleToggleActive}
                  pendingStatusId={pendingStatusId}
                  entityLabel="Type"
                  sensors={sensors}
                  onDragEnd={handleDragEnd}
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

// ---------------------------------------------------------------------------
// DnD-aware status list
// ---------------------------------------------------------------------------

interface DndStatusListProps {
  statuses: StatusItem[];
  onEdit: (status: StatusItem) => void;
  onToggleActive: (status: StatusItem) => void;
  pendingStatusId: string | null;
  entityLabel: string;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (event: DragEndEvent) => void;
}

// Lock dragging movement strictly to vertical axis
const restrictToVerticalAxis = ({ transform }: { transform: { x: number; y: number; scaleX: number; scaleY: number } }) => ({
  ...transform,
  x: 0,
});

// Hybrid collision detection: pointerWithin first for pinpoint accuracy, falling back to closestCenter
const customCollisionDetection = (args: Parameters<typeof pointerWithin>[0]) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return closestCenter(args);
};

function DndStatusList({
  statuses,
  onEdit,
  onToggleActive,
  pendingStatusId,
  entityLabel,
  sensors,
  onDragEnd,
}: DndStatusListProps) {
  if (statuses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
        <p className="text-sm">No custom {entityLabel.toLowerCase()}s defined.</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y bg-background">
          {statuses.map((status) => (
            <SortableStatusRow
              key={status.id}
              status={status}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              pendingStatusId={pendingStatusId}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Sortable row wrapper — provides the drag transform/transition
// ---------------------------------------------------------------------------

interface SortableStatusRowProps {
  status: StatusItem;
  onEdit: (status: StatusItem) => void;
  onToggleActive: (status: StatusItem) => void;
  pendingStatusId: string | null;
}

function SortableStatusRow({
  status,
  onEdit,
  onToggleActive,
  pendingStatusId,
}: SortableStatusRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
  });

  // Zero out X so the row never drifts sideways — keeps hit detection accurate
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform ? { ...transform, x: 0 } : null),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StatusRowDisplay
        status={status}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
        pendingStatusId={pendingStatusId}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared display row (used by both the sortable row and the drag overlay)
// ---------------------------------------------------------------------------

interface StatusRowDisplayProps {
  status: StatusItem;
  onEdit: (status: StatusItem) => void;
  onToggleActive: (status: StatusItem) => void;
  pendingStatusId: string | null;
  isOverlay?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

function StatusRowDisplay({
  status,
  onEdit,
  onToggleActive,
  pendingStatusId,
  isOverlay = false,
  dragHandleProps,
}: StatusRowDisplayProps) {
  const isToggleable = !status.is_default;
  const isCurrentToggling = pendingStatusId === status.id;
  const isAnyToggling = pendingStatusId !== null;

  return (
    <div
      {...dragHandleProps}
      className={`flex items-center justify-between transition-colors group cursor-grab active:cursor-grabbing touch-none select-none custom-spacing-x-y py-1 ${
        isOverlay
          ? 'bg-background shadow-lg border rounded-md opacity-95'
          : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/10'
      }`}
    >
      <div className="flex items-center flex-1 min-w-0">
        <div className="mr-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0">
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex items-center gap-3 w-[220px] shrink-0">
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

      <div
        className="flex items-center gap-1 shrink-0"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isToggleable) {
                      onToggleActive(status);
                    }
                  }}
                  disabled={isAnyToggling || !isToggleable}
                >
                  {isCurrentToggling ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : status.is_active ? (
                    <Eye className={isToggleable ? 'h-5 w-5 text-muted-foreground' : 'h-5 w-5 text-muted-foreground opacity-50'} />
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
          onClick={(e) => {
            e.stopPropagation();
            onEdit(status);
          }}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
