'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Building2,
  Clock3,
  Inbox,
  Ticket,
  Users,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';

import { getServiceCloudDashboardService } from '../../services';
import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';

function formatHours(seconds: number) {
  return `${Math.round((Number(seconds || 0) / 3600) * 10) / 10}h`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

function maxCount(rows: any[], key: string) {
  return Math.max(1, ...rows.map((row) => Number(row[key] ?? 0)));
}

function percent(value: number, max: number) {
  return `${Math.min(100, Math.round((Number(value || 0) / max) * 100))}%`;
}

export function ServiceCloudDashboardPage({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { canAccess, isLoading: isPermissionLoading } =
    useServiceCloudPermissions(workspaceId);
  const canView = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.dashboard,
    SERVICE_CLOUD_FEATURE_KEYS.view,
  );

  const { data, isLoading } = useQuery({
    queryKey: ['service-cloud', 'dashboard', workspaceId],
    queryFn: () => getServiceCloudDashboardService(workspaceId),
    enabled: Boolean(workspaceId && canView),
  });

  if (isPermissionLoading) {
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
  }

  if (!canView) {
    return <ServiceCloudAccessDenied label="Service Cloud" />;
  }

  const reports = data?.reports ?? {};
  const statusBreakdown = reports.statusBreakdown ?? [];
  const priorityBreakdown = reports.priorityBreakdown ?? [];
  const customerBreakdown = reports.customerBreakdown ?? [];
  const openTicketAging = reports.openTicketAging ?? [];
  const statusMax = maxCount(statusBreakdown, 'count');

  const cards = [
    {
      label: 'Total Tickets',
      value: data?.totalTickets ?? 0,
      icon: Ticket,
      detail: 'All active service tickets',
    },
    {
      label: 'Open Tickets',
      value: data?.openTickets ?? 0,
      icon: AlertCircle,
      detail: 'Unresolved customer work',
    },
    {
      label: 'Customers',
      value: data?.customers ?? 0,
      icon: Users,
      detail: 'Support customer records',
    },
    {
      label: 'Organizations',
      value: data?.organizations ?? 0,
      icon: Building2,
      detail: 'Linked companies',
    },
    {
      label: 'Logged Time',
      value: formatHours(data?.totalLoggedSeconds ?? 0),
      icon: Clock3,
      detail: 'Tracked support effort',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_35%),linear-gradient(135deg,_#111827,_#0f766e_55%,_#1e3a8a)] p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
              Service Cloud
            </Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Support operations overview
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Real-time view of workload, customer pressure, open ticket aging,
              and support effort.
            </p>
          </div>
          <div className="grid min-w-[260px] gap-2 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <Metric
              label="Open workload"
              value={String(data?.openTickets ?? 0)}
              muted
            />
            <Metric
              label="Logged effort"
              value={formatHours(data?.totalLoggedSeconds ?? 0)}
              muted
            />
            <Metric
              label="Customers served"
              value={String(data?.customers ?? 0)}
              muted
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-medium">
                    {card.label}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {card.detail}
                  </CardDescription>
                </div>
                <Icon className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {isLoading ? '...' : card.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Workload</CardTitle>
              <CardDescription>
                Where the current support queue is concentrated.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {statusBreakdown.length === 0 ? (
                <EmptyState label="No ticket statuses found." />
              ) : (
                statusBreakdown.map((status: any) => (
                  <div key={status.id}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{status.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {status.lifecycle ?? 'workflow'} ·{' '}
                          {formatHours(status.loggedSeconds)} logged
                        </div>
                      </div>
                      <div className="text-2xl font-semibold">
                        {status.count}
                      </div>
                    </div>
                    <div className="bg-muted h-2 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: percent(status.count, statusMax) }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Tickets</CardTitle>
              <CardDescription>
                Newest customer issues entering the queue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.recentTickets ?? []).length === 0 ? (
                  <EmptyState label="No tickets yet." />
                ) : (
                  data.recentTickets.map((ticket: any) => (
                    <Link
                      key={ticket.id}
                      href={`/home/services/tickets/${ticket.id}`}
                      className="hover:bg-muted/40 block rounded-xl border p-4 transition-colors"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">
                            #{ticket.ticket_number} {ticket.subject}
                          </div>
                          <div className="text-muted-foreground mt-1 text-sm">
                            {ticket.source} · {formatDate(ticket.created_at)}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {ticket.email_count ?? 0} emails
                        </Badge>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Priority Pressure</CardTitle>
              <CardDescription>Open work by severity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {priorityBreakdown.length === 0 ? (
                <EmptyState label="No priority data yet." />
              ) : (
                priorityBreakdown.slice(0, 6).map((priority: any) => (
                  <div
                    key={priority.id}
                    className="flex items-center justify-between rounded-xl border p-3"
                  >
                    <div>
                      <div className="font-medium">{priority.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {priority.openCount} open tickets
                      </div>
                    </div>
                    <Badge variant="secondary">{priority.count}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer Pressure</CardTitle>
              <CardDescription>
                Customers with the most open service work.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerBreakdown.length === 0 ? (
                <EmptyState label="No customer ticket data." />
              ) : (
                customerBreakdown.slice(0, 6).map((customer: any) => (
                  <div key={customer.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-muted-foreground text-xs">
                          {customer.email ||
                            customer.organization ||
                            'No contact context'}
                        </div>
                      </div>
                      <Badge>{customer.openTickets} open</Badge>
                    </div>
                    <div className="text-muted-foreground mt-2 text-xs">
                      {customer.totalTickets} total ·{' '}
                      {formatHours(customer.loggedSeconds)} logged
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Oldest Open Tickets</CardTitle>
              <CardDescription>
                Tickets most likely to need attention.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {openTicketAging.length === 0 ? (
                <EmptyState label="No open tickets." />
              ) : (
                openTicketAging.slice(0, 6).map((ticket: any) => (
                  <Link
                    key={ticket.id}
                    href={`/home/services/tickets/${ticket.id}`}
                    className="hover:bg-muted/40 block rounded-xl border p-3"
                  >
                    <div className="font-medium">
                      #{ticket.ticketNumber} {ticket.subject}
                    </div>
                    <div className="text-muted-foreground mt-1 text-xs">
                      {ticket.customer} · {ticket.assignee} · {ticket.daysOpen}d
                      open
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className={muted ? 'text-white/70' : 'text-muted-foreground'}>
        {label}
      </span>
      <span className={`text-right font-medium ${muted ? 'text-white' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
      {label}
    </div>
  );
}
