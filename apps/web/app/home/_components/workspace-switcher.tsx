'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Building2 } from 'lucide-react';
import { useUser } from '@kit/supabase/hooks/use-user';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
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
          .select(`
            workspace_id,
            workspaces (
              id,
              name
            )
          `)
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
            ])
          ).values()
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
      <div className="px-4 py-3 flex items-center gap-2 text-slate-400">
        <Building2 className="w-4 h-4" />
        <span className="text-sm font-medium">No workspace</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-800/50 rounded-lg transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 flex-shrink-0 text-slate-400" />
            <span className="text-sm font-medium text-slate-200 truncate">
              {currentWorkspace.name}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 flex-shrink-0 text-slate-400" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {workspaces.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => handleWorkspaceChange(workspace.id)}
            className="cursor-pointer"
          >
            <Building2 className="w-4 h-4 mr-2" />
            <span>{workspace.name}</span>
            {workspace.id === currentWorkspace?.id && (
              <span className="ml-auto text-xs text-blue-400">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
