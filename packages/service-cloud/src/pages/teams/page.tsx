'use client';

import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import { ServiceCloudResourcePage, StatusBadge } from '../_components/resource-page';

export function ServiceCloudTeamsPage({ workspaceId }: { workspaceId: string }) {
  const { canAccess, isLoading } = useServiceCloudPermissions(workspaceId);
  const canView = canAccess(SERVICE_CLOUD_MODULE_KEYS.teams, SERVICE_CLOUD_FEATURE_KEYS.view);
  const canCreate = canAccess(SERVICE_CLOUD_MODULE_KEYS.teams, SERVICE_CLOUD_FEATURE_KEYS.create);
  const canEdit = canAccess(SERVICE_CLOUD_MODULE_KEYS.teams, SERVICE_CLOUD_FEATURE_KEYS.edit);
  const canDelete = canAccess(SERVICE_CLOUD_MODULE_KEYS.teams, SERVICE_CLOUD_FEATURE_KEYS.delete);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  if (!canView) return <ServiceCloudAccessDenied label="support teams" />;

  return (
    <ServiceCloudResourcePage
      workspaceId={workspaceId}
      resource="teams"
      title="Support Teams"
      description="Manage support groups such as Billing, Technical Support, and Escalations."
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      fields={[
        { key: 'name', label: 'Name', required: true },
        { key: 'description', label: 'Description' },
        { key: 'email_alias', label: 'Email Alias', type: 'email' },
      ]}
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'email_alias', label: 'Email Alias' },
        { key: 'is_active', label: 'Status', render: (team) => <StatusBadge value={team.is_active === false ? 'Inactive' : 'Active'} /> },
      ]}
    />
  );
}
