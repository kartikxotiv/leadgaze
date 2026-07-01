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
    data: workspaceCheckData,
    isLoading: isWorkspaceLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['userHasWorkspace', user?.id],
    queryFn: async () => {
      if (!user?.id) return { hasWorkspace: false, isOnboardingFinished: true };

      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces!inner(is_onboarding_finished)')
        .eq('user_id', user.id)
        .eq('status', 'accepted')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Workspace check error:', error);
        throw error;
      }

      const hasWorkspace = !!data;
      const isOnboardingFinished =
        (data?.workspaces as any)?.is_onboarding_finished ?? true;

      return { hasWorkspace, isOnboardingFinished };
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const isLoading = isUserLoading || (!!user?.id && isWorkspaceLoading);

  const hasWorkspace = workspaceCheckData?.hasWorkspace ?? false;
  const isOnboardingFinished = workspaceCheckData?.isOnboardingFinished ?? true;

  useEffect(() => {
    if (isLoading || isError || !user?.id) return;

    // No workspace at all → go create one
    if (hasWorkspace === false) {
      router.push(pathsConfig.app.workspaceSetup);
      return;
    }

    // Has workspace but onboarding not finished → send back to setup
    if (hasWorkspace === true && !isOnboardingFinished) {
      router.push(pathsConfig.app.workspaceSetup);
    }
  }, [isLoading, isError, user?.id, hasWorkspace, isOnboardingFinished, router]);

  return {
    hasWorkspace: user?.id ? (hasWorkspace ?? null) : null,
    isOnboardingFinished,
    isLoading,
    refetch,
  };
}
