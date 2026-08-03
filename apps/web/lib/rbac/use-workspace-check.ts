'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useUser } from '@kit/supabase/hooks/use-user';
import { useRBAC } from '~/lib/rbac/rbac-provider';

import pathsConfig from '~/config/paths.config';

export function useWorkspaceCheck() {
  const { data: user, isLoading: isUserLoading } = useUser();
  const router = useRouter();
  const { workspaces, isInitialized, isLoading: rbacLoading, error } = useRBAC();

  const isLoading = isUserLoading || (!isInitialized && rbacLoading);
  const hasWorkspace = workspaces.length > 0;
  
  // Find if any workspace has onboarding finished (or check current workspace if needed)
  const isOnboardingFinished = workspaces.length === 0 || workspaces.some((w: any) => w.is_onboarding_finished !== false);

  useEffect(() => {
    // Never redirect while any fetch is in flight
    if (isLoading || error || !user?.id || !isInitialized) return;

    // No workspace at all → go create one
    if (hasWorkspace === false) {
      router.push(pathsConfig.app.workspaceSetup);
      return;
    }

    // Has workspace but onboarding not finished → send back to setup
    if (hasWorkspace === true && !isOnboardingFinished) {
      router.push(pathsConfig.app.workspaceSetup);
    }
  }, [isLoading, error, user?.id, isInitialized, hasWorkspace, isOnboardingFinished, router]);

  return {
    hasWorkspace: user?.id && isInitialized ? hasWorkspace : null,
    isOnboardingFinished,
    isLoading,
    refetch: () => {}, // No-op since refetch is handled by RBACProvider now
  };
}
