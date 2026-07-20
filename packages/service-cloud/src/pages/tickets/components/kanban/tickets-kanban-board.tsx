'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  closestCenter,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { toast } from 'sonner';

import { updateServiceCloudResourceService } from '../../../../services';
import { TicketsKanbanCard } from './tickets-kanban-card';
import { TicketsKanbanColumn } from './tickets-kanban-column';

interface TicketsKanbanBoardProps {
  workspaceId: string;
  tickets: any[];
  statuses: any[];
  priorities: any[];
  isLoading: boolean;
  canUpdate: boolean;
  canCreate: boolean;
  canDelete: boolean;
  onClick: (id: string) => void;
  onDelete: (ticket: any) => void;
  onCreateTicket: (statusId: string) => void;
  refetch: () => void;
}

export function TicketsKanbanBoard({
  workspaceId,
  tickets,
  statuses,
  priorities,
  isLoading,
  canUpdate,
  canCreate,
  canDelete,
  onClick,
  onDelete,
  onCreateTicket,
  refetch,
}: TicketsKanbanBoardProps) {
  const [activeTicket, setActiveTicket] = useState<any | null>(null);
  const [optimisticTickets, setOptimisticTickets] = useState<any[] | null>(null);

  const priorityById = useMemo(() => {
    return new Map(priorities.map((p) => [p.id, p]));
  }, [priorities]);

  // Clear optimistic state when server data changes
  useEffect(() => {
    setOptimisticTickets(null);
  }, [tickets]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const currentTickets = optimisticTickets ?? tickets;

  const ticketsByStatus = useMemo(() => {
    const map = new Map<string, any[]>();
    statuses.forEach((s) => map.set(s.id, []));
    currentTickets.forEach((t) => {
      const bucket = map.get(t.status_id);
      if (bucket) bucket.push(t);
    });
    return map;
  }, [currentTickets, statuses]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const ticket = currentTickets.find((t) => t.id === event.active.id);
      setActiveTicket(ticket ?? null);
    },
    [currentTickets],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTicket(null);

      if (!over) return;

      const draggedId = active.id as string;
      const targetStatusId = over.id as string;

      const draggedTicket = currentTickets.find((t) => t.id === draggedId);
      if (!draggedTicket) return;

      if (draggedTicket.status_id === targetStatusId) return;

      // Optimistic update
      const snapshot = currentTickets;
      setOptimisticTickets(
        currentTickets.map((t) =>
          t.id === draggedId ? { ...t, status_id: targetStatusId } : t,
        ),
      );

      try {
        await updateServiceCloudResourceService('tickets', {
          id: draggedId,
          workspace_id: workspaceId,
          status_id: targetStatusId,
        });
        refetch();
        toast.success('Status updated');
      } catch (err: any) {
        setOptimisticTickets(snapshot);
        toast.error(err.message || 'Failed to update status');
      }
    },
    [currentTickets, refetch],
  );

  if (isLoading) {
    const CARD_COUNTS = [3, 2, 3, 1, 2, 1];
    return (
      <div className="flex h-full w-full gap-3 overflow-x-auto p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex min-w-[220px] flex-1 flex-col rounded-xl border border-border/60 bg-zinc-100/60 shadow-sm overflow-hidden dark:border-border/40 dark:bg-zinc-900/30"
          >
            <div className="h-1.5 w-full bg-muted-foreground/20" />
            <div className="flex items-center justify-between border-b border-border/40 bg-white/40 px-3 py-3 dark:bg-[#151718]/40">
              <div className="h-4 w-24 rounded bg-muted/60 animate-pulse" />
              <div className="h-5 w-8 rounded-full bg-muted/60 animate-pulse" />
            </div>
            <div className="flex flex-col gap-2.5 p-2 pt-2.5">
              {Array.from({ length: CARD_COUNTS[i] ?? 2 }).map((_, j) => (
                <div key={j} className="h-24 rounded-lg border bg-white dark:border-white/10 dark:bg-[#22272b] animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (statuses.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="flex max-w-sm flex-col items-center text-center">
          <p className="text-muted-foreground text-sm">
            No statuses found. Create some statuses to use the kanban view.
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 overflow-x-auto pb-4 pt-1">
        <div className="flex h-full gap-3">
          {statuses.map((status) => (
            <TicketsKanbanColumn
              key={status.id}
              status={status}
              tickets={ticketsByStatus.get(status.id) || []}
              priorityById={priorityById}
              canUpdate={canUpdate}
              canCreate={canCreate}
              canDelete={canDelete}
              onClick={onClick}
              onDelete={onDelete}
              onCreateTicket={onCreateTicket}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 250, easing: 'ease-out' }}>
        {activeTicket ? (
          <div className="rotate-2 cursor-grabbing opacity-90 shadow-2xl z-[9999]">
            <TicketsKanbanCard
              ticket={activeTicket}
              priorityById={priorityById}
              canUpdate={true}
              canDelete={false}
              onDelete={() => {}}
              onClick={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
