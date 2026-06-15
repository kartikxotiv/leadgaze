'use client';

import { useState } from 'react';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { Check, Filter, UserCheck } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { Button } from '@kit/ui/button';

import { getServiceCloudTicketLookupsService } from '../../services';
import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import {
  ServiceCloudResourcePage,
  StatusBadge,
} from '../_components/resource-page';
import { formatDate } from '@kit/shared/utils';

function assigneeInitials(assignee: any) {
  const account = assignee?.account;
  const label = account?.name || account?.email || '?';

  return label
    .split(/\s|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase())
    .join('');
}

function AssigneeStack({ assignees = [] }: { assignees?: any[] }) {
  if (assignees.length === 0) {
    return <span className="text-muted-foreground text-xs">Unassigned</span>;
  }

  const visibleAssignees = assignees.slice(0, 4);
  const overflowCount = assignees.length - visibleAssignees.length;

  return (
    <div className="flex items-center">
      {visibleAssignees.map((assignee: any) => {
        const account = assignee.account;

        return (
          <Avatar
            key={assignee.id}
            className="border-background -ml-2 h-7 w-7 border-2 first:ml-0"
            title={account?.name || account?.email || 'Unassigned'}
          >
            <AvatarImage src={account?.picture_url ?? undefined} />
            <AvatarFallback className="text-[10px]">
              {assigneeInitials(assignee)}
            </AvatarFallback>
          </Avatar>
        );
      })}
      {overflowCount > 0 ? (
        <div className="border-background bg-muted -ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-medium">
          +{overflowCount}
        </div>
      ) : null}
    </div>
  );
}

export function ServiceCloudTicketsPage({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [assignedToMeOnly, setAssignedToMeOnly] = useState(false);
  const { canAccess, isLoading } = useServiceCloudPermissions(workspaceId);
  const canView = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.tickets,
    SERVICE_CLOUD_FEATURE_KEYS.view,
  );
  const canCreate = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.tickets,
    SERVICE_CLOUD_FEATURE_KEYS.create,
  );
  const canEdit = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.tickets,
    SERVICE_CLOUD_FEATURE_KEYS.edit,
  );
  const canDelete = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.tickets,
    SERVICE_CLOUD_FEATURE_KEYS.delete,
  );

  // Optimized: single API call fetches statuses + priorities + categories in parallel on server
  const { data: lookups } = useQuery({
    queryKey: ['service-cloud', 'ticket-lookups', workspaceId],
    queryFn: () => getServiceCloudTicketLookupsService(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const statuses: any[] = lookups?.statuses ?? [];
  const priorities: any[] = lookups?.priorities ?? [];
  const categories: any[] = lookups?.categories ?? [];

  if (isLoading)
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
  if (!canView) return <ServiceCloudAccessDenied label="tickets" />;

  const statusOptions = statuses.map((status: any) => ({
    label: status.name,
    value: status.id,
  }));
  const openStatus =
    statuses.find((status: any) => status.lifecycle === 'open') ?? statuses[0];
  const priorityOptions = priorities.map((priority: any) => ({
    label: priority.name,
    value: priority.id,
  }));
  const categoryOptions = categories.map((category: any) => ({
    label: category.name,
    value: category.id,
  }));
  const statusById = new Map(
    statuses.map((status: any) => [status.id, status.name]),
  );
  const priorityById = new Map(
    priorities.map((priority: any) => [priority.id, priority.name]),
  );

  return (
    <ServiceCloudResourcePage
      workspaceId={workspaceId}
      resource="tickets"
      title="Tickets"
      description="Create, assign, and track support requests."
      canCreate={canCreate}
      canEdit={canEdit}
      canDelete={canDelete}
      queryParams={assignedToMeOnly ? { assignedToMe: 'true' } : {}}
      toolbar={
        <Button
          type="button"
          variant={assignedToMeOnly ? 'default' : 'outline'}
          onClick={() => setAssignedToMeOnly((current) => !current)}
        >
          {assignedToMeOnly ? (
            <Check className="mr-2 h-4 w-4" />
          ) : (
            <Filter className="mr-2 h-4 w-4" />
          )}
          Assigned to me
        </Button>
      }
      defaults={{ source: 'manual', status_id: openStatus?.id }}
      fields={[
        { key: 'subject', label: 'Subject', required: true },
        { key: 'description', label: 'Description' },
        {
          key: 'status_id',
          label: 'Status',
          type: 'select',
          required: true,
          options: statusOptions,
        },
        {
          key: 'priority_id',
          label: 'Priority',
          type: 'select',
          options: priorityOptions,
        },
        {
          key: 'category_id',
          label: 'Category',
          type: 'select',
          options: categoryOptions,
        },
      ]}
      columns={[
        { key: 'ticket_number', label: 'Ticket #' },
        {
          key: 'subject',
          label: 'Subject',
          render: (ticket) => (
            <Link
              href={`/home/services/tickets/${ticket.id}`}
              className="text-primary font-medium hover:underline"
            >
              {ticket.subject}
            </Link>
          ),
        },
        {
          key: 'assignees',
          label: 'Assignees',
          render: (ticket) => <AssigneeStack assignees={ticket.assignees} />,
        },
        {
          key: 'status_id',
          label: 'Status',
          render: (ticket) => (
            <StatusBadge value={statusById.get(ticket.status_id) as string} />
          ),
        },
        {
          key: 'priority_id',
          label: 'Priority',
          render: (ticket) => (
            <StatusBadge
              value={priorityById.get(ticket.priority_id) as string}
            />
          ),
        },
        {
          key: 'created_at',
          label: 'Created',
          render: (ticket) =>
            ticket.created_at
              ? formatDate(ticket.created_at)
              : '-',
        },
      ]}
    />
  );
}
