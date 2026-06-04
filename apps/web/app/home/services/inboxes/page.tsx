'use client';

import { ServiceCloudInboxesPage } from '@kit/service-cloud';

import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function ServiceCloudInboxesRoute() {
  const { currentWorkspace } = useRBAC();
  if (!currentWorkspace?.id) return <div>No workspace selected</div>;
  return <ServiceCloudInboxesPage workspace={currentWorkspace} />;
}
