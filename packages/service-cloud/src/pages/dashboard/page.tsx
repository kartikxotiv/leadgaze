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
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import { Skeleton } from '@kit/ui/skeleton';

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

  if (isPermissionLoading || isLoading) {
    return <ServiceCloudDashboardSkeleton />;
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
      iconBg: 'bg-primary dark:bg-primary',
    },
    {
      label: 'Open Tickets',
      value: data?.openTickets ?? 0,
      icon: AlertCircle,
      detail: 'Unresolved customer work',
      iconBg: 'bg-activity-4',
    },
    {
      label: 'Customers',
      value: data?.customers ?? 0,
      icon: Users,
      detail: 'Support customer records',
      iconBg: 'bg-activity-5',
    },
    {
      label: 'Organizations',
      value: data?.organizations ?? 0,
      icon: Building2,
      detail: 'Linked companies',
      iconBg: 'bg-activity-3',
    },
    {
      label: 'Logged Time',
      value: formatHours(data?.totalLoggedSeconds ?? 0),
      icon: Clock3,
      detail: 'Tracked support effort',
      iconBg: 'bg-activity-6',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-none border bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_35%),linear-gradient(135deg,_#111827,_#0f766e_55%,_#1e3a8a)] p-6 text-white shadow-xl">
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
            <Card
              key={card.label}
              className="flex h-32 flex-col justify-between xl:h-28 2xl:h-32"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
                <div className="space-y-1">
                  <CardTitle className="secondary-text-small text-leadgaze-muted dark:text-white">
                    {card.label}
                  </CardTitle>
                  <div className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
                    {card.value}
                  </div>
                </div>
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded ${card.iconBg}`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
                <CardDescription className="secondary-text-small text-leadgaze-success">
                  {card.detail}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <CardWidgetContainer
            title="Status Workload"
            description="Where the current support queue is concentrated."
          >
            <div className="space-y-4 px-6 py-4">
              {statusBreakdown.length === 0 ? (
                <EmptyState label="No ticket statuses found." />
              ) : (
                statusBreakdown.map((status: any, index: number) => (
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
                    <div className="bar-bg h-2 w-full overflow-hidden rounded-full">
                      <div
                        className="bg-leadgaze-success h-full rounded-full transition-all duration-500"
                        style={{ width: percent(status.count, statusMax) }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Recent Tickets"
            description="Newest customer issues entering the queue."
          >
            <div className="px-6 py-4">
              {(data?.recentTickets ?? []).length === 0 ? (
                <EmptyState label="No tickets yet." />
              ) : (
                <CardWidgetList>
                  {data.recentTickets.map((ticket: any) => (
                    <Link
                      key={ticket.id}
                      href={`/home/services/tickets/${ticket.id}`}
                      className="block"
                    >
                      <CardWidgetListItem
                        icon={
                          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full">
                            <Ticket className="h-4 w-4" />
                          </div>
                        }
                        title={`#${ticket.ticket_number} ${ticket.subject}`}
                        subtitle={`${ticket.source} · ${formatDate(ticket.created_at)}`}
                        badge={
                          <Badge variant="outline">
                            {ticket.email_count ?? 0} emails
                          </Badge>
                        }
                      />
                    </Link>
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>
        </div>

        <aside className="space-y-6">
          <CardWidgetContainer
            title="Priority Pressure"
            description="Open work by severity."
            hideHeaderBorder={true}
          >
            <div className="px-6 py-4">
              {priorityBreakdown.length === 0 ? (
                <EmptyState label="No priority data yet." />
              ) : (
                <CardWidgetList>
                  {priorityBreakdown.slice(0, 6).map((priority: any) => (
                    <CardWidgetListItem
                      key={priority.id}
                      title={priority.name}
                      subtitle={`${priority.openCount} open tickets`}
                      badge={
                        <Badge variant="secondary">{priority.count}</Badge>
                      }
                    />
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Customer Pressure"
            description="Customers with the most open service work."
            hideHeaderBorder={true}
          >
            <div className="px-6 py-4">
              {customerBreakdown.length === 0 ? (
                <EmptyState label="No customer ticket data." />
              ) : (
                <CardWidgetList>
                  {customerBreakdown.slice(0, 6).map((customer: any) => (
                    <CardWidgetListItem
                      key={customer.id}
                      title={customer.name}
                      subtitle={
                        customer.email ||
                        customer.organization ||
                        'No contact context'
                      }
                      badge={<Badge>{customer.openTickets} open</Badge>}
                      metadata={
                        <span>
                          {customer.totalTickets} total ·{' '}
                          {formatHours(customer.loggedSeconds)} logged
                        </span>
                      }
                    />
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Oldest Open Tickets"
            description="Tickets most likely to need attention."
            hideHeaderBorder={true}
          >
            <div className="px-6 py-4">
              {openTicketAging.length === 0 ? (
                <EmptyState label="No open tickets." />
              ) : (
                <CardWidgetList>
                  {openTicketAging.slice(0, 6).map((ticket: any) => (
                    <Link
                      key={ticket.id}
                      href={`/home/services/tickets/${ticket.id}`}
                      className="block"
                    >
                      <CardWidgetListItem
                        title={`#${ticket.ticketNumber} ${ticket.subject}`}
                        subtitle={`${ticket.customer} · ${ticket.assignee}`}
                        badge={
                          <Badge variant="secondary">
                            {ticket.daysOpen}d open
                          </Badge>
                        }
                      />
                    </Link>
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>
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

export function ServiceCloudDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero banner skeleton */}
      <section className="overflow-hidden rounded-none border bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.18),_transparent_35%),linear-gradient(135deg,_#111827,_#0f766e_55%,_#1e3a8a)] p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <Skeleton className="h-5 w-28 rounded-full bg-white/20" />
            <Skeleton className="h-9 w-64 bg-white/20" />
            <Skeleton className="h-4 w-80 bg-white/15" />
          </div>
          <div className="grid min-w-[260px] gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-24 bg-white/20" />
                <Skeleton className="h-4 w-10 bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stat cards skeleton */}
      <div className="grid gap-4 md:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card
            key={i}
            className="flex h-32 flex-col justify-between xl:h-28 2xl:h-32"
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
              <div className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-12" />
              </div>
              <Skeleton className="h-8 w-8 rounded" />
            </CardHeader>
            <CardContent className="xl:p-3 xl:pt-2 2xl:p-5 2xl:pt-2">
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Status Workload skeleton */}
          <Card>
            <CardHeader className="border-b">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-1 h-3 w-52" />
            </CardHeader>
            <div className="space-y-4 px-6 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-7 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Tickets skeleton */}
          <Card>
            <CardHeader className="border-b">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-1 h-3 w-52" />
            </CardHeader>
            <div className="space-y-3 px-6 py-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <Skeleton className="h-8 w-8 flex-shrink-0 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right aside skeleton */}
        <aside className="space-y-6">
          {[
            'Priority Pressure',
            'Customer Pressure',
            'Oldest Open Tickets',
          ].map((title) => (
            <Card key={title}>
              <CardHeader>
                <Skeleton className="h-5 w-36" />
                <Skeleton className="mt-1 h-3 w-44" />
              </CardHeader>
              <div className="space-y-3 px-6 py-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </aside>
      </div>
    </div>
  );
}
