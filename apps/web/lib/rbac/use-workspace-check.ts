'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { useUser } from '@kit/supabase/hooks/use-user';

import pathsConfig from '~/config/paths.config';

export function useWorkspaceCheck() {
  const { data: user, isPending } = useUser();
  const router = useRouter();

  const {
    data: hasWorkspace,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['userHasWorkspace', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const supabase = getSupabaseBrowserClient();

      const { data, error, count } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (error) {
        console.error('Workspace check error:', error);
        throw error;
      }

      // Use count from the response
      const hasWorkspaces = (count ?? 0) > 0;

      return hasWorkspaces;
    },
    enabled: !!user?.id,
    staleTime: 0, // Don't cache, always fresh
    gcTime: 0, // Don't keep in garbage collection
  });

  useEffect(() => {
    if (!isLoading && user && hasWorkspace === false) {
      router.push(pathsConfig.app.workspaceSetup);
    }
  }, [isLoading, user, hasWorkspace, router]);

  return { hasWorkspace, isLoading, refetch };
}
