'use client';

import { ServiceCloudCustomersPage } from '@kit/service-cloud';

import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function ServiceCloudCustomersRoute() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <ServiceCloudCustomersPage workspaceId={workspaceId} />;
}
