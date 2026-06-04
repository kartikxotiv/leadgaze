'use client';

import { useQuery } from '@tanstack/react-query';

import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { getServiceCloudResourceService } from '../../services';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import { ServiceCloudResourcePage, StatusBadge } from '../_components/resource-page';

export function ServiceCloudTicketsPage({ workspaceId }: { workspaceId: string }) {
  const { canAccess, isLoading } = useServiceCloudPermissions(workspaceId);
  const canView = canAccess(SERVICE_CLOUD_MODULE_KEYS.tickets, SERVICE_CLOUD_FEATURE_KEYS.view);
  const canCreate = canAccess(SERVICE_CLOUD_MODULE_KEYS.tickets, SERVICE_CLOUD_FEATURE_KEYS.create);
  const canEdit = canAccess(SERVICE_CLOUD_MODULE_KEYS.tickets, SERVICE_CLOUD_FEATURE_KEYS.edit);
  const canDelete = canAccess(SERVICE_CLOUD_MODULE_KEYS.tickets, SERVICE_CLOUD_FEATURE_KEYS.delete);

  const { data: statuses = [] } = useQuery({
    queryKey: ['service-cloud', 'ticket-statuses', workspaceId],
    queryFn: () => getServiceCloudResourceService('ticket-statuses', workspaceId),
    enabled: Boolean(workspaceId),
  });
  const { data: priorities = [] } = useQuery({
    queryKey: ['service-cloud', 'ticket-priorities', workspaceId],
    queryFn: () => getServiceCloudResourceService('ticket-priorities', workspaceId),
    enabled: Boolean(workspaceId),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['service-cloud', 'ticket-categories', workspaceId],
    queryFn: () => getServiceCloudResourceService('ticket-categories', workspaceId),
    enabled: Boolean(workspaceId),
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Checking permissions...</div>;
  if (!canView) return <ServiceCloudAccessDenied label="tickets" />;

  const statusOptions = statuses.map((status: any) => ({ label: status.name, value: status.id }));
  const priorityOptions = priorities.map((priority: any) => ({ label: priority.name, value: priority.id }));
  const categoryOptions = categories.map((category: any) => ({ label: category.name, value: category.id }));
  const statusById = new Map(statuses.map((status: any) => [status.id, status.name]));
  const priorityById = new Map(priorities.map((priority: any) => [priority.id, priority.name]));

  return (
    <ServiceCloudResourcePage
      workspaceId={workspaceId}
      resource="tickets"
      title="Tickets"
      description="Create, assign, and track support requests."
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      defaults={{ source: 'manual', status_id: statusOptions[0]?.value }}
      fields={[
        { key: 'subject', label: 'Subject', required: true },
        { key: 'description', label: 'Description' },
        { key: 'status_id', label: 'Status', type: 'select', required: true, options: statusOptions },
        { key: 'priority_id', label: 'Priority', type: 'select', options: priorityOptions },
        { key: 'category_id', label: 'Category', type: 'select', options: categoryOptions },
      ]}
      columns={[
        { key: 'ticket_number', label: 'Ticket #' },
        { key: 'subject', label: 'Subject' },
        { key: 'status_id', label: 'Status', render: (ticket) => <StatusBadge value={statusById.get(ticket.status_id) as string} /> },
        { key: 'priority_id', label: 'Priority', render: (ticket) => <StatusBadge value={priorityById.get(ticket.priority_id) as string} /> },
        { key: 'created_at', label: 'Created', render: (ticket) => ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '-' },
      ]}
    />
  );
}
