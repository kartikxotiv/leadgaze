'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useUser } from '@kit/supabase/hooks/use-user';

import pathsConfig from '~/config/paths.config';

export function useWorkspaceCheck() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const supabase = useSupabase();

  const {
    data: hasWorkspace,
    isLoading: isWorkspaceLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['userHasWorkspace', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { error, count } = await supabase
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
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // We consider it "loading" if we are still fetching the user OR the workspace
  const isLoading = isUserLoading || (!!user?.id && isWorkspaceLoading);

  useEffect(() => {
    // Only redirect if we are sure the user is logged in AND we have finished checking for workspaces
    // and explicitly found that they have none.
    if (!isLoading && !isError && user?.id && hasWorkspace === false) {
      router.push(pathsConfig.app.workspaceSetup);
    }
  }, [isLoading, isError, user?.id, hasWorkspace, router]);

  return {
    hasWorkspace: user?.id ? (hasWorkspace ?? null) : null,
    isLoading,
    refetch,
  };
}
