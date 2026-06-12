'use client';

import {
  ServiceCloudDashboardPage,
  ServiceCloudDashboardSkeleton,
} from '@kit/service-cloud';

import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function ServiceCloudDashboardRoute() {
  const { currentWorkspace, isLoading } = useRBAC();

  if (isLoading) {
    return <ServiceCloudDashboardSkeleton />;
  }

  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <ServiceCloudDashboardPage workspaceId={workspaceId} />;
}
