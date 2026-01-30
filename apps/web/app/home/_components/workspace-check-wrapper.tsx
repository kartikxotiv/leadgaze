'use client';

import { ReactNode } from 'react';

import Link from 'next/link';

import { Button } from '@kit/ui/button';

import pathsConfig from '~/config/paths.config';
import { useWorkspaceCheck } from '~/lib/rbac/use-workspace-check';

export function WorkspaceCheckWrapper({ children }: { children: ReactNode }) {
  const { hasWorkspace, isLoading } = useWorkspaceCheck();

  // During loading or if we haven't confirmed there is NO workspace,
  // just render children. This prevents the "No Workspace Found" flicker.
  if (isLoading || hasWorkspace !== false) {
    return <>{children}</>;
  }

  // Only show this if we are 100% sure the user has NO workspace
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="mb-2 text-2xl font-bold text-slate-900">
          No Workspace Found
        </h2>
        <p className="mb-6 text-slate-600">
          Please create a workspace to continue
        </p>
        <Button asChild>
          <Link href={pathsConfig.app.workspaceSetup}>Create Workspace</Link>
        </Button>
      </div>
    </div>
  );
}
