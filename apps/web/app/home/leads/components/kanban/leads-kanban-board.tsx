'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import { Skeleton } from '@kit/ui/skeleton';

import { Lead } from '~/services/leads.service';

import { LeadsKanbanCard } from './leads-kanban-card';
import { LeadsKanbanColumn } from './leads-kanban-column';

interface Status {
  id: string;
  status_name: string;
  status_key: string;
  color: string;
  icon?: string;
  sort_order?: number;
}

interface LeadsKanbanBoardProps {
  leads: Lead[];
  statuses: Status[];
  isLoading: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCreate: boolean;
  onLeadClick: (id: string) => void;
  onDelete: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatusId: string) => Promise<void>;
  onCreateLead: () => void;
}

// ---------------------------------------------------------------------------
// Full-board skeleton — matches the reference screenshot:
// Gray column shells with gray card rectangles, no colors or real content.
// ---------------------------------------------------------------------------
function KanbanBoardSkeleton() {
  // Show 5 skeleton columns (same as a typical status set)
  const SKELETON_COLUMNS = 5;
  // Each column gets a different number of card skeletons for a realistic look
  const CARD_COUNTS = [3, 2, 3, 2, 1];

  return (
    <div className="flex h-full min-h-0 gap-3 overflow-x-auto pb-3 pr-2">
      {Array.from({ length: SKELETON_COLUMNS }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="flex w-[300px] shrink-0 flex-col rounded-xl border border-border/60 bg-zinc-100/60 shadow-sm dark:border-border/40 dark:bg-zinc-900/30 overflow-hidden"
        >
          {/* Skeleton Top Status Color Bar */}
          <div className="h-1.5 w-full bg-muted-foreground/20" />

          {/* Skeleton column header */}
          <div className="flex items-center gap-2 px-3 py-3 border-b border-border/40 bg-background/40">
            <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-full" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-5 w-6 rounded-full" />
          </div>

          {/* Skeleton card list */}
          <div className="flex flex-1 flex-col gap-2.5 px-2 pt-2.5 pb-2">
            {Array.from({ length: CARD_COUNTS[colIdx] ?? 2 }).map(
              (_, cardIdx) => (
                <div
                  key={cardIdx}
                  className="rounded-lg border bg-white dark:bg-[#22272b] dark:border-white/10 p-3 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4 rounded" />
                      <Skeleton className="h-3 w-1/2 rounded" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-4 w-12 rounded" />
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main board
// ---------------------------------------------------------------------------
export function LeadsKanbanBoard({
  leads,
  statuses,
  isLoading,
  canUpdate,
  canDelete,
  canCreate,
  onLeadClick,
  onDelete,
  onStatusChange,
  onCreateLead,
}: LeadsKanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [optimisticLeads, setOptimisticLeads] = useState<Lead[] | null>(null);

  // Clear optimistic state as soon as the server data (leads prop) updates.
  // This prevents the flicker: we no longer clear optimistic state eagerly in
  // the finally block — instead we wait for the refetch to propagate new data.
  useEffect(() => {
    setOptimisticLeads(null);
  }, [leads]);

  // Configure sensors: mouse, touch and keyboard
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor),
  );

  // Sort statuses by sort_order, exclude 'unqualified'
  const sortedStatuses = useMemo(
    () =>
      [...statuses]
        .filter((s) => s.status_key !== 'unqualified')
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [statuses],
  );

  // The current lead list (optimistic override or server data)
  const currentLeads = optimisticLeads ?? leads;

  // Group leads by status_id
  const leadsByStatus = useMemo(() => {
    const map = new Map<string, Lead[]>();
    sortedStatuses.forEach((s) => map.set(s.id, []));
    currentLeads.forEach((lead) => {
      const bucket = map.get(lead.status_id);
      if (bucket) bucket.push(lead);
    });
    return map;
  }, [currentLeads, sortedStatuses]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const lead = currentLeads.find((l) => l.id === event.active.id);
      setActiveLead(lead ?? null);
    },
    [currentLeads],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveLead(null);

      if (!over) return;

      const draggedLeadId = active.id as string;
      const targetStatusId = over.id as string;

      const draggedLead = currentLeads.find((l) => l.id === draggedLeadId);
      if (!draggedLead) return;

      // No change if dropped on same column
      if (draggedLead.status_id === targetStatusId) return;

      // Optimistic update
      const snapshot = currentLeads;
      setOptimisticLeads(
        currentLeads.map((l) =>
          l.id === draggedLeadId ? { ...l, status_id: targetStatusId } : l,
        ),
      );

      try {
        await onStatusChange(draggedLeadId, targetStatusId);
        // Do NOT clear optimisticLeads here. The useEffect above will clear it
        // once the parent's refetch completes and passes new `leads` prop.
      } catch {
        // Revert optimistic update on API failure
        setOptimisticLeads(snapshot);
      }
    },
    [currentLeads, onStatusChange],
  );

  const handleDragCancel = useCallback(() => {
    setActiveLead(null);
  }, []);

  // Show full-board skeleton while loading (replaces the real board entirely)
  if (isLoading) {
    return <KanbanBoardSkeleton />;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Horizontal scrolling board */}
      <div className="flex h-full min-h-0 gap-3 overflow-x-auto pb-3 pr-2 pl-[1px]">
        {sortedStatuses.map((status) => (
          <LeadsKanbanColumn
            key={status.id}
            status={status}
            leads={leadsByStatus.get(status.id) ?? []}
            isLoading={false}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canCreate={canCreate}
            onLeadClick={onLeadClick}
            onDelete={onDelete}
            onCreateLead={onCreateLead}
          />
        ))}

        {/* Fallback: no statuses */}
        {sortedStatuses.length === 0 && (
          <div className="flex w-full items-center justify-center text-muted-foreground text-sm py-16">
            No statuses configured. Go to Settings → Status Management to add
            statuses.
          </div>
        )}
      </div>

      {/* Drag overlay: floating ghost card while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeLead ? (
          <div className="w-72 rotate-1 opacity-95 shadow-2xl ring-2 ring-primary/40 rounded-lg">
            <LeadsKanbanCard
              lead={activeLead}
              canUpdate={false}
              canDelete={false}
              onClick={() => {}}
              onDelete={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
