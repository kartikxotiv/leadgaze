'use client';

import React from 'react';

import { LayoutDashboard, LayoutList } from 'lucide-react';

import { Button } from '@kit/ui/button';
import { cn } from '@kit/ui/utils';

export type ViewMode = 'table' | 'kanban';

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
  className?: string;
}

/**
 * Generic view toggle: switches between table and kanban.
 * Drop this into ListToolBar's `statusSlot` on any page.
 */
export function ViewToggle({ view, onChange, className }: ViewToggleProps) {
  return (
    <div
      className={cn(
        'flex items-center rounded-md border bg-background overflow-hidden h-[28px]',
        className,
      )}
    >
      <Button
        id="view-toggle-table"
        variant="ghost"
        size="sm"
        className={cn(
          'h-[28px] w-[28px] rounded-none border-0 p-0',
          view === 'table'
            ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
            : 'text-muted-foreground hover:bg-transparent hover:text-muted-foreground',
        )}
        onClick={() => onChange('table')}
        title="Table view"
        aria-label="Switch to table view"
        aria-pressed={view === 'table'}
      >
        <LayoutList className="h-4 w-4" />
      </Button>

      <Button
        id="view-toggle-kanban"
        variant="ghost"
        size="sm"
        className={cn(
          'h-[28px] w-[28px] rounded-none border-0 border-l p-0',
          view === 'kanban'
            ? 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
            : 'text-muted-foreground hover:bg-transparent hover:text-muted-foreground',
        )}
        onClick={() => onChange('kanban')}
        title="Kanban view"
        aria-label="Switch to kanban view"
        aria-pressed={view === 'kanban'}
      >
        <LayoutDashboard className="h-4 w-4" />
      </Button>
    </div>
  );
}
