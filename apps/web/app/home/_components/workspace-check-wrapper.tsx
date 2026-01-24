'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@kit/ui/button';
import { useWorkspaceCheck } from '~/lib/rbac/use-workspace-check';
import pathsConfig from '~/config/paths.config';

export function WorkspaceCheckWrapper({ children }: { children: ReactNode }) {
  const { hasWorkspace, isLoading } = useWorkspaceCheck();

  // During hydration, render children to match server render
  // This prevents hydration mismatches
  if (isLoading) {
    return <>{children}</>;
  }

  if (!hasWorkspace) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            No Workspace Found
          </h2>
          <p className="text-slate-600 mb-6">
            Please create a workspace to continue
          </p>
          <Button asChild>
            <Link href={pathsConfig.app.workspaceSetup}>
              Create Workspace
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
