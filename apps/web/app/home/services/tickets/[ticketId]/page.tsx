'use client';

import { useParams } from 'next/navigation';

import { ServiceCloudTicketDetailPage } from '@kit/service-cloud';

import { useFieldPermissions } from '~/lib/hooks/use-field-permissions';
import { useRBAC } from '~/lib/rbac/rbac-provider';

export default function ServiceCloudTicketDetailRoute() {
  const params = useParams<{ ticketId: string }>();
  const { currentWorkspace, user } = useRBAC();
  const workspaceId = currentWorkspace?.id;

  const { canView, canEdit } = useFieldPermissions({
    entityType: 'tickets',
    workspaceId,
    enabled: !!workspaceId && !!user?.id,
    productKey: 'service-cloud',
  });

  if (!workspaceId) return <div>No workspace selected</div>;

  return (
    <ServiceCloudTicketDetailPage
      workspaceId={workspaceId}
      ticketId={params.ticketId}
      canViewField={canView}
      canEditField={canEdit}
    />
  );
}
