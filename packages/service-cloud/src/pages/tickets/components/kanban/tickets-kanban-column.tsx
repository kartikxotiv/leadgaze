'use client';

import React from 'react';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';

import { TicketsKanbanCard } from './tickets-kanban-card';

interface TicketsKanbanColumnProps {
  status: any;
  tickets: any[];
  priorityById: Map<string, any>;
  canUpdate: boolean;
  canCreate: boolean;
  canDelete: boolean;
  onClick: (id: string) => void;
  onDelete: (ticket: any) => void;
  onCreateTicket: (statusId: string) => void;
}

export function TicketsKanbanColumn({
  status,
  tickets,
  priorityById,
  canUpdate,
  canCreate,
  canDelete,
  onClick,
  onDelete,
  onCreateTicket,
}: TicketsKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  return (
    <div className="flex w-[300px] shrink-0 flex-col rounded-xl border border-border/100 bg-gray-light shadow-sm dark:border-border/100 dark:bg-zinc-900/30 overflow-hidden first:ml-[1px]">
      <div
        className="h-1.5 w-full shrink-0"
        style={{ backgroundColor: status.color || '#cbd5e1' }}
      />
      <div className="flex items-center justify-between border-b border-border/100 bg-white px-3 py-3 backdrop-blur-sm dark:dark-black-light-bg">
        <div className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: status.color || '#cbd5e1' }}
          />
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
            {status.name}
          </h3>
        </div>
        <div className="rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
          {tickets.length}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[150px] flex-1 flex-col gap-2.5 overflow-y-auto px-2 pb-2 pt-2.5 transition-colors ${
          isOver ? 'bg-primary/5 ring-1 ring-inset ring-primary/20' : ''
        }`}
      >
        <SortableContext
          items={tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <TicketsKanbanCard
              key={ticket.id}
              ticket={ticket}
              priorityById={priorityById}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onDelete={onDelete}
              onClick={onClick}
            />
          ))}
        </SortableContext>
        
      </div>

      {canCreate && (
        <div className="shrink-0 border-t border-border/40 bg-background/20 p-2">
          <Button
            variant="ghost"
            className="h-8 w-full justify-start gap-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={() => onCreateTicket(status.id)}
          >
            <Plus className="h-4 w-4" />
            Add Ticket
          </Button>
        </div>
      )}
    </div>
  );
}
