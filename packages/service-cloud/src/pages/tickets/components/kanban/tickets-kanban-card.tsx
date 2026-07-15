'use client';

import React from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { MoreHorizontal, Trash } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';

function assigneeInitials(assignee: any) {
  const account = assignee?.account;
  const label = account?.name || account?.email || '?';
  return label
    .split(/\\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('');
}

interface TicketsKanbanCardProps {
  ticket: any;
  priorityById: Map<string, any>;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: (ticket: any) => void;
  onClick: (id: string) => void;
}

export function TicketsKanbanCard({
  ticket,
  priorityById,
  canUpdate,
  canDelete,
  onDelete,
  onClick,
}: TicketsKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    disabled: !canUpdate,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColor = priorityById.get(ticket.priority_id)?.color;
  const priorityName = priorityById.get(ticket.priority_id)?.name || 'None';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex flex-col gap-2 rounded-lg border bg-white p-3 shadow-sm transition-all dark:border-white/10 dark:bg-[#22272b] hover:border-primary/40 hover:shadow-md ${
        isDragging
          ? 'scale-[1.02] opacity-60 shadow-xl ring-2 ring-primary/40 z-50'
          : ''
      } ${canUpdate ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      {...attributes}
      {...listeners}
      onClick={() => onClick(ticket.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(ticket.id);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0 flex-1">
          {/* <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
            <span>{ticket.ticket_number}</span>
          </div> */}
          <span className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
            {ticket.subject}
          </span>
          {ticket.customer?.name ? (
            <span className="mt-1 truncate text-xs text-muted-foreground">
              {ticket.customer.name}
            </span>
          ) : null}
        </div>

        {canDelete && (
          <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div
                  className="rounded p-1 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100 transition-opacity cursor-pointer"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(ticket);
                  }}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-1">
        <div 
          className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-transparent shadow-sm flex items-center gap-1"
          style={{ backgroundColor: `${priorityColor}15`, color: priorityColor }}
        >
          {priorityColor && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priorityColor }} />}
          {priorityName}
        </div>

        <div className="flex -space-x-2">
          {ticket.assignees?.slice(0, 3).map((assignee: any) => {
            const account = assignee.account;
            return (
              <Avatar
                key={assignee.id}
                className="h-6 w-6 border-2 border-background"
                title={account?.name || account?.email || 'Unassigned'}
              >
                <AvatarImage src={account?.picture_url ?? undefined} />
                <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-bold">
                  {assigneeInitials(assignee)}
                </AvatarFallback>
              </Avatar>
            );
          })}
          {ticket.assignees?.length > 3 && (
            <div className="border-background bg-muted flex h-6 w-6 items-center justify-center rounded-full border-2 text-[9px] font-medium z-10">
              +{ticket.assignees.length - 3}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
