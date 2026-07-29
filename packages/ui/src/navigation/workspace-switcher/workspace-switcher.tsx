'use client';

import { Building2, ChevronDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';

export interface WorkspaceItem {
  id: string;
  name: string;
}

export interface WorkspaceSwitcherProps {
  currentWorkspace?: WorkspaceItem | null;
  workspaces?: WorkspaceItem[];
  onWorkspaceChange?: (workspaceId: string) => void;
  className?: string;
}

export function WorkspaceSwitcher({
  currentWorkspace,
  workspaces = [],
  onWorkspaceChange,
  className,
}: WorkspaceSwitcherProps) {
  if (!currentWorkspace || workspaces.length === 0) {
    return (
      <div className="text-muted-foreground/60 flex items-center gap-2 px-4 py-3">
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-medium">No workspace</span>
      </div>
    );
  }

  return (
    <div className={className ?? 'px-2 py-2'}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="hover:bg-accent group flex w-full items-center justify-between rounded-md px-3 py-2 pr-1 transition-colors">
            <div className="flex min-w-0 items-center gap-2">
              <div className="bg-primary/10 text-primary flex h-6 w-6 items-center justify-center rounded transition-colors">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <span className="truncate text-sm font-semibold">
                {currentWorkspace.name}
              </span>
            </div>
            <ChevronDown className="text-muted-foreground/50 group-hover:text-accent-foreground h-4 w-4 flex-shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" sideOffset={8}>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => onWorkspaceChange?.(workspace.id)}
              className="cursor-pointer gap-2 py-2"
            >
              <Building2 className="text-muted-foreground h-4 w-4" />
              <span className="flex-1 truncate">{workspace.name}</span>
              {workspace.id === currentWorkspace?.id && (
                <span className="bg-primary h-2 w-2 rounded-full" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
