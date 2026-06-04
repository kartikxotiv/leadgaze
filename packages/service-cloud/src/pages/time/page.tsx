'use client';

import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import { ServiceCloudResourcePage } from '../_components/resource-page';

export function ServiceCloudTimePage({ workspaceId }: { workspaceId: string }) {
  const { canAccess, isLoading } = useServiceCloudPermissions(workspaceId);
  const canView = canAccess(SERVICE_CLOUD_MODULE_KEYS.timeTracking, SERVICE_CLOUD_FEATURE_KEYS.view);
  const canLog = canAccess(SERVICE_CLOUD_MODULE_KEYS.timeTracking, SERVICE_CLOUD_FEATURE_KEYS.log);
  const canEdit = canAccess(SERVICE_CLOUD_MODULE_KEYS.timeTracking, SERVICE_CLOUD_FEATURE_KEYS.edit);
  const canDelete = canAccess(SERVICE_CLOUD_MODULE_KEYS.timeTracking, SERVICE_CLOUD_FEATURE_KEYS.delete);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  if (!canView) return <ServiceCloudAccessDenied label="time entries" />;

  return (
    <ServiceCloudResourcePage
      workspaceId={workspaceId}
      resource="time-entries"
      title="Time Entries"
      description="Track agent time spent on support tickets."
      canCreate={canLog}
      canEdit={canEdit}
      canDelete={canDelete}
      fields={[
        { key: 'ticket_id', label: 'Ticket ID', required: true },
        { key: 'account_id', label: 'Agent Account ID', required: true },
        { key: 'duration_seconds', label: 'Duration Seconds', type: 'number', required: true },
        { key: 'description', label: 'Description' },
      ]}
      columns={[
        { key: 'ticket_id', label: 'Ticket' },
        { key: 'account_id', label: 'Agent' },
        { key: 'duration_seconds', label: 'Seconds' },
        { key: 'logged_date', label: 'Date' },
        { key: 'description', label: 'Description' },
      ]}
    />
  );
}
