'use client';

import { ServiceCloudTicketsPage } from '@kit/service-cloud';

import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function ServiceCloudTicketsRoute() {
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;
  if (!workspaceId) return <div>No workspace selected</div>;
  return <ServiceCloudTicketsPage workspaceId={workspaceId} />;
}
