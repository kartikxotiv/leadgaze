'use client';

import React from 'react';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { cn } from '@kit/ui/utils';

import { Lead } from '~/services/leads.service';

import { LeadsKanbanCard } from './leads-kanban-card';

interface Status {
  id: string;
  status_name: string;
  status_key: string;
  color: string;
  icon?: string;
}

interface LeadsKanbanColumnProps {
  status: Status;
  leads: Lead[];
  isLoading?: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCreate: boolean;
  onLeadClick: (id: string) => void;
  onDelete: (lead: Lead) => void;
  onCreateLead: (statusId: string) => void;
}

export function LeadsKanbanColumn({
  status,
  leads,
  canUpdate,
  canDelete,
  canCreate,
  onLeadClick,
  onDelete,
  onCreateLead,
}: LeadsKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.id,
  });

  return (
    <div className="flex w-[300px] shrink-0 flex-col rounded-xl border border-border/100 bg-gray-light shadow-sm dark:border-border/100 dark:bg-zinc-900/30 overflow-hidden first:ml-[1px]">
      {/* Top Status Color Bar */}
      <div className="h-1.5 w-full" style={{ backgroundColor: status.color }} />

      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border/100 bg-white px-3 py-3 backdrop-blur-sm dark:dark-black-light-bg">
        <div className="flex items-center gap-2">
          {/* Subtle colored dot for status */}
          <span
            className="h-2 w-2 shrink-0 rounded-full shadow-sm"
            style={{ backgroundColor: status.color }}
          />
          <span className="truncate text-xs font-bold uppercase tracking-wider text-foreground/80">
            {status.status_name}
          </span>
        </div>
        
        {/* Count Pill */}
        <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
          {leads.length}
        </span>
      </div>

      {/* Drop zone / card list */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[150px] flex-1 flex-col gap-2.5 overflow-y-auto px-2 pt-2.5 pb-2 transition-colors',
          isOver && 'bg-primary/5 ring-1 ring-inset ring-primary/20',
        )}
      >
        {leads.length === 0 ? (
          /* Empty state */
          <div
            className={cn(
              'flex flex-1 items-center justify-center rounded-lg border border-transparent border-dashed',
              'py-8 text-xs text-muted-foreground/50 transition-colors',
              isOver && 'border-primary/40 text-primary/60',
            )}
          >
            {isOver ? 'Drop here' : ''}
          </div>
        ) : (
          /* Lead cards */
          leads.map((lead) => (
            <LeadsKanbanCard
              key={lead.id}
              lead={lead}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onClick={() => onLeadClick(lead.id)}
              onDelete={() => onDelete(lead)}
            />
          ))
        )}
      </div>

      {/* Footer: Add lead button */}
      {canCreate && (
        <div className="border-t border-border/40 p-2 bg-background/20">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={() => onCreateLead(status.id)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Lead
          </Button>
        </div>
      )}
    </div>
  );
}
