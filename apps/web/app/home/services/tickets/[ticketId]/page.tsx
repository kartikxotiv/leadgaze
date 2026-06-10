'use client';

import { useParams } from 'next/navigation';

import { ServiceCloudTicketDetailPage } from '@kit/service-cloud';

import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function ServiceCloudTicketDetailRoute() {
  const params = useParams<{ ticketId: string }>();
  const { currentWorkspace } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  if (!workspaceId) return <div>No workspace selected</div>;

  return (
    <ServiceCloudTicketDetailPage
      workspaceId={workspaceId}
      ticketId={params.ticketId}
    />
  );
}
