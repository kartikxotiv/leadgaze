'use client';

import { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { Building2, ChevronDown } from 'lucide-react';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';

import { useRBAC } from '~/lib/rbac/rbac-provider';

interface Workspace {
  id: string;
  name: string;
}

export function WorkspaceSwitcher() {
  const { data: user } = useUser();
  const router = useRouter();
  const { currentWorkspace } = useRBAC();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      if (!user?.id) return;

      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();

      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .select(
            `
            workspace_id,
            workspaces (
              id,
              name
            )
          `,
          )
          .eq('user_id', user.id)
          .eq('status', 'accepted');

        if (error) throw error;

        const uniqueWorkspaces = Array.from(
          new Map(
            data?.map((item: any) => [
              item.workspaces.id,
              {
                id: item.workspaces.id,
                name: item.workspaces.name,
              },
            ]),
          ).values(),
        );

        setWorkspaces(uniqueWorkspaces as Workspace[]);
      } catch (error) {
        console.error('Failed to fetch workspaces:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspaces();
  }, [user?.id]);

  const handleWorkspaceChange = (workspaceId: string) => {
    // Store the selected workspace ID (could use localStorage or context)
    localStorage.setItem('selectedWorkspace', workspaceId);
    router.refresh();
  };

  if (!currentWorkspace || workspaces.length === 0) {
    return (
      <div className="text-muted-foreground/60 flex items-center gap-2 px-4 py-3">
        <Building2 className="h-4 w-4" />
        <span className="text-sm font-medium">No workspace</span>
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
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
              onClick={() => handleWorkspaceChange(workspace.id)}
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
