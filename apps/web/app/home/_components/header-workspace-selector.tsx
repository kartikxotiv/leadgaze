'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Check, ChevronDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { cn } from '@kit/ui/utils';

import { AppLogo } from '~/components/app-logo';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export function HeaderWorkspaceSelector() {
  const router = useRouter();
  const { currentWorkspace, workspaces, selectWorkspace } = useRBAC();
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleOpen = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(true);
  };

  const handleClose = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleWorkspaceChange = (workspaceId: string) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsOpen(false);
    selectWorkspace(workspaceId);
    router.refresh();
  };

  if (!currentWorkspace) {
    return <AppLogo className="max-h-8 w-auto py-1" />;
  }

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <div
            className="flex cursor-pointer items-center space-x-1.5 rounded-lg p-1 transition-colors hover:bg-white/10"
            role="button"
            tabIndex={0}
          >
            <AppLogo href={null} className="max-h-8 w-auto py-1" />
            <ChevronDown
              className={cn(
                'h-4 w-4 text-white/80 transition-transform duration-200 hover:text-white',
                isOpen && 'rotate-180',
              )}
            />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
          className="z-[100] w-64 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspaces
          </div>
          {workspaces.map((workspace) => {
            const isSelected = workspace.id === currentWorkspace.id;
            return (
              <DropdownMenuItem
                key={workspace.id}
                onClick={() => handleWorkspaceChange(workspace.id)}
                className={cn(
                  'flex cursor-pointer items-center justify-between rounded-md px-2.5 py-2 text-sm transition-colors',
                  isSelected
                    ? 'bg-zinc-100 font-medium text-leadgaze-primary dark:bg-zinc-800/80 dark:text-white'
                    : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900',
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold',
                      isSelected
                        ? 'bg-leadgaze-primary/10 text-leadgaze-primary dark:bg-white/10 dark:text-white'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
                    )}
                  >
                    <Building2 className="h-4 w-4" />
                  </div>
                  <span className="truncate">{workspace.name}</span>
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 shrink-0 text-leadgaze-primary dark:text-white" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
