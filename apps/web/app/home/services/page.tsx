'use client';

import { ServiceCloudDashboardPage } from '@kit/service-cloud';

import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function ServiceCloudDashboardRoute() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <ServiceCloudDashboardPage workspaceId={workspaceId} />;
}
