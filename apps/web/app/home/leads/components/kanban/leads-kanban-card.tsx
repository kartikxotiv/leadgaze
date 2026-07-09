'use client';

import React from 'react';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { MoreHorizontal, Trash2, ExternalLink } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { cn } from '@kit/ui/utils';

import { calculateLeadScore } from '~/lib/lead-scoring/lead-scoring-engine';
import { Lead } from '~/services/leads.service';

interface LeadsKanbanCardProps {
  lead: Lead;
  canUpdate: boolean;
  canDelete: boolean;
  onClick: () => void;
  onDelete: () => void;
}

export function LeadsKanbanCard({
  lead,
  canUpdate,
  canDelete,
  onClick,
  onDelete,
}: LeadsKanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: lead.id,
      disabled: !canUpdate,
      data: { lead },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  const score = calculateLeadScore({
    first_name: lead.first_name,
    last_name: lead.last_name,
    company_name: lead.company_name,
    industry_id: lead.industry_id || lead.industry?.id,
    company_size: lead.company_size,
    location: lead.location,
    timezone: lead.timezone,
    job_title: lead.job_title,
    contacted_count: lead.contacted_count,
    status_key: lead.status?.status_key,
    custom_fields: lead.custom_fields || {},
    source_id: lead.source_id,
  }).totalScore;

  const initials = `${lead.first_name?.[0] ?? ''}${lead.last_name?.[0] ?? ''}`.toUpperCase() || 'L';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex flex-col gap-3 rounded-lg border bg-white p-3 shadow-sm transition-all dark:border-white/10 dark:bg-[#22272b]',
        'hover:border-primary/40 hover:shadow-md',
        isDragging && 'scale-[1.02] opacity-60 shadow-xl ring-2 ring-primary/40',
        canUpdate && 'cursor-grab active:cursor-grabbing',
      )}
      {...attributes}
      {...listeners}
      onPointerDown={(e) => {
        // Let dnd-kit handle the pointer down, but we don't prevent default 
        // so clicks can still fire if it's not a drag.
        listeners?.onPointerDown?.(e);
      }}
      onClick={(e) => {
        // Stop propagation just in case, though onClick on root usually works fine
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-1">
          <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {lead.first_name} {lead.last_name || ''}
          </span>
          {lead.company_name && (
            <p className="truncate text-xs text-muted-foreground">
              {lead.company_name}
            </p>
          )}
        </div>

        {/* Actions dropdown — stop propagation so drag/click doesn't fire */}
        <div 
          className="shrink-0" 
          onPointerDown={(e) => e.stopPropagation()} 
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Card actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem className="gap-2 text-xs" onClick={onClick}>
                <ExternalLink className="h-3.5 w-3.5" />
                View Details
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-xs text-destructive focus:text-destructive"
                    onClick={onDelete}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        {/* Score Tag (mimics Jira tags) */}
        <div
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            score > 70
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : score > 40
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400'
          )}
        >
          Score: {score}
        </div>

        {/* Avatar */}
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
          {initials}
        </div>
      </div>
    </div>
  );
}
