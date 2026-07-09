'use client';

import React from 'react';

import { useDroppable } from '@dnd-kit/core';
import { Plus } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { cn } from '@kit/ui/utils';

import { Opportunity } from '~/services/opportunities.service';

import { OpportunitiesKanbanCard } from './opportunities-kanban-card';

interface Stage {
  id: string;
  status_name: string;
  color?: string;
  icon?: string;
}

interface OpportunitiesKanbanColumnProps {
  stage: Stage;
  opportunities: Opportunity[];
  isLoading?: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canCreate: boolean;
  onOpportunityClick: (id: string) => void;
  onDelete: (opportunity: Opportunity) => void;
  onCreateOpportunity: () => void;
}

export function OpportunitiesKanbanColumn({
  stage,
  opportunities,
  canUpdate,
  canDelete,
  canCreate,
  onOpportunityClick,
  onDelete,
  onCreateOpportunity,
}: OpportunitiesKanbanColumnProps) {
  const isNewStage = stage.status_name.toLowerCase() === 'new';
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    disabled: isNewStage,
  });

  return (
    <div className="flex w-[300px] shrink-0 flex-col rounded-xl border border-border/60 bg-zinc-100/60 shadow-sm dark:border-border/40 dark:bg-zinc-900/30 overflow-hidden first:ml-[1px]">
      {/* Top Status Color Bar */}      
      <div className="h-1.5 w-full" style={{ backgroundColor: stage.status_name === "New" ? "#3953E7" : (stage.color || "#cbd5e1") }} />

      {/* Column Header */}
      <div className="flex items-center justify-between border-b border-border/40 bg-background/40 px-3 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {/* Subtle colored dot for status */}
          <span
            className="h-2 w-2 shrink-0 rounded-full shadow-sm"
            style={{ backgroundColor: stage.color || '#cbd5e1' }}
          />
          <span className="truncate text-xs font-bold uppercase tracking-wider text-foreground/80">
            {stage.status_name}
          </span>
        </div>
        
        {/* Count Pill */}
        <span className="rounded-full bg-muted/80 px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
          {opportunities.length}
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
        {opportunities.length === 0 ? (
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
          /* Opportunity cards */
          opportunities.map((opportunity) => (
            <OpportunitiesKanbanCard
              key={opportunity.id}
              opportunity={opportunity}
              canUpdate={canUpdate}
              canDelete={canDelete}
              onClick={() => onOpportunityClick(opportunity.id)}
              onDelete={() => onDelete(opportunity)}
            />
          ))
        )}
      </div>

      {/* Footer: Add opportunity button */}
      {canCreate && (
        <div className="border-t border-border/40 p-2 bg-background/20">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-full justify-start gap-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            onClick={onCreateOpportunity}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Opportunity
          </Button>
        </div>
      )}
    </div>
  );
}
