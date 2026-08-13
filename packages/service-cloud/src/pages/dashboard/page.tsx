'use client';

import Link from 'next/link';
import { useMemo } from 'react';

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
import { useLocalization } from '@kit/shared/localization';
import { cn } from '@kit/ui/utils';

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

function maxCount(rows: any[], key: string) {
  return Math.max(1, ...rows.map((row) => Number(row[key] ?? 0)));
}

function percent(value: number, max: number) {
  return `${Math.min(100, Math.round((Number(value || 0) / max) * 100))}%`;
}

export function ServiceCloudDashboardPage({
  workspaceId,
  dateFilter,
  dateRange,
}: {
  workspaceId: string;
  dateFilter?: { from: string | null; to: string | null } | null;
  dateRange?: any;
}) {
  const { formatDate } = useLocalization();
  const { canAccess, isLoading: isPermissionLoading } =
    useServiceCloudPermissions(workspaceId);
  const canView = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.dashboard,
    SERVICE_CLOUD_FEATURE_KEYS.view,
  );

  const queryString = useMemo(() => {
    if (!dateRange || !dateRange.preset) return '';
    const params = new URLSearchParams();
    params.set('timeframePreset', dateRange.preset);
    if (dateRange.from) params.set('timeframeFrom', dateRange.from);
    if (dateRange.to) params.set('timeframeTo', dateRange.to);
    return `?${params.toString()}`;
  }, [dateRange]);

  const { data, isLoading } = useQuery({
    queryKey: ['service-cloud', 'dashboard', workspaceId, dateFilter],
    queryFn: () => getServiceCloudDashboardService(workspaceId, dateFilter),
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
      iconBg: 'bg-primary dark:bg-leadgaze-primary',
      link: '/home/services/tickets',
    },
    {
      label: 'Open Tickets',
      value: data?.openTickets ?? 0,
      icon: AlertCircle,
      detail: 'Unresolved customer work',
      iconBg: 'bg-activity-4',
      link: '/home/services/tickets?status=open',
    },
    {
      label: 'Customers',
      value: data?.customers ?? 0,
      icon: Users,
      detail: 'Support customer records',
      iconBg: 'bg-activity-5',
      link: '/home/services/customers?tab=customers',
    },
    {
      label: 'Organizations',
      value: data?.organizations ?? 0,
      icon: Building2,
      detail: 'Linked companies',
      iconBg: 'bg-activity-3',
      link: '/home/services/customers?tab=organizations',
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
    <div className="space-y-2">      

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="flex m-h-32 flex-col justify-between xl:h-28 2xl:h-32"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
                <div className="space-y-1">
                  <CardTitle className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">
                    {card.label}
                  </CardTitle>
                  {card.link ? <Link
                    href={card.link.includes('?') ? `${card.link}&${queryString.replace('?', '')}` : `${card.link}${queryString}`}
                    className="hover:underline"
                  >
                    <div className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
                      {card.value}
                    </div>
                  </Link>: <div className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
                      {card.value}
                    </div>}

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

      <div className="flex flex-col lg:flex-row gap-2 w-full">
        <div className="space-y-2 w-full lg:w-[65%]">
          <CardWidgetContainer
            title="Status Workload"
            description="Where the current support queue is concentrated."
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className="space-y-4 px-2 py-2  max-h-[460px] overflow-auto">
              {statusBreakdown.length === 0 ? (
                <EmptyState label="No ticket statuses found." />
              ) : (
                statusBreakdown.map((status: any) => {
                  let barColor = 'bg-leadgaze-success';
                  const nameLower = status.name.toLowerCase();
                  if (nameLower === 'new') barColor = 'var(--color-ticket-status-new)';
                  else if (nameLower === 'open') barColor = 'var(--color-ticket-status-open)';
                  else if (nameLower === 'in progress') barColor = 'var(--color-ticket-status-in-progress)';
                  else if (nameLower.includes('waiting')) barColor = 'var(--color-ticket-status-waiting)';
                  else if (nameLower === 'resolved') barColor = 'var(--color-ticket-status-resolved)';
                  else if (nameLower === 'closed') barColor = 'var(--color-ticket-status-closed)';

                  const isCustomColor = barColor.startsWith('var(') || barColor.startsWith('#');

                  return (
                    <div key={status.id}>
                      <div className="mb-2 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">{status.name}</span>
                          <span className="text-muted-foreground text-xs">•</span>
                          <span className="text-muted-foreground text-xs">{formatHours(status.loggedSeconds ?? 0)} logged</span>
                        </div>
                        <div className="secondary-text-small-semibold font-bold text-leadgaze-dark dark:text-white">{status.count}</div>
                      </div>
                      <div className="bar-bg h-2 w-full overflow-hidden rounded-full bg-[#EDEEF0]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${!isCustomColor ? barColor : ''}`}
                          style={{
                            width: percent(status.count, statusMax),
                            ...(isCustomColor ? { backgroundColor: barColor } : {})
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Recent Tickets"
            description="Newest customer issues entering the queue."
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className="py-0 max-h-[280px] overflow-auto">
              {(data?.recentTickets ?? []).length === 0 ? (
                <EmptyState label="No tickets yet." />
              ) : (
                <CardWidgetList className="gap-0 mb-1">
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
                          <Badge variant="outline" className="text-[11px] font-normal bg-[#E7E8EA] rounded-none dark:text-leadgaze-dark">
                            {ticket.email_count ?? 0} emails
                          </Badge>
                        }
                        className="gap-0 border-l-0 border-r-0 border-t-0 rounded-none"
                        isBadgeVerticalCenter={true}
                      />
                    </Link>
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>
        </div>

        <div className="space-y-2 w-full lg:w-[35%]">
          <CardWidgetContainer
            title="Priority Pressure"
            description="Open work by severity."            
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className="px-2 py-2 overflow-auto max-h-[280px]">
              {priorityBreakdown.length === 0 ? (
                <EmptyState label="No priority data yet." />
              ) : (
                <div className="space-y-2">
                  {priorityBreakdown.slice(0, 6).map((priority: any) => {
                    const nameLower = priority.name.toLowerCase();
                    const isUrgent = nameLower === 'urgent';
                    const isCritical = nameLower === 'critical';
                    
                    const textColor = isCritical ? 'var(--color-ticket-priority-critical-text)' : undefined;
                    const subTextColor = isUrgent || isCritical ? 'var(--color-ticket-priority-critical-text)' : undefined;
                    const badgeBg = isUrgent ? 'var(--color-ticket-priority-urgent-bg)' : isCritical ? 'var(--color-ticket-priority-critical-bg)' : '#E5E7EB';
                    const badgeColor = isUrgent ? 'var(--color-ticket-priority-critical-text)' : isCritical ? '#FFFFFF' : '#111827';
                    
                    const itemClass = cn(
                      "flex items-center justify-between p-2 border bg-white dark:bg-zinc-900",
                      isCritical ? "border-[#FADAD6]" : "border-border"
                    );

                    return (
                      <div key={priority.id} className={itemClass}>
                        <div>
                          <div className="secondary-text-small-semibold" style={{ color: textColor || 'inherit' }}>{priority.name}</div>
                          <div className="text-[10px] mt-1 uppercase" style={{ color: subTextColor || 'var(--color-leadgaze-muted)' }}>{`${priority.openCount} OPEN`}</div>
                        </div>
                        <Badge 
                          className="px-2 py-1 !secondary-text-small-semibold rounded-sm hover:opacity-100"
                          style={{ backgroundColor: badgeBg, color: badgeColor, border: 'none' }}
                        >
                          {priority.count}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Customer Pressure"
            description="Customers with the most open service work."
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className="px-0  py-0 max-h-[280px] overflow-auto">
              {customerBreakdown.length === 0 ? (
                <EmptyState label="No customer ticket data." />
              ) : (
                <CardWidgetList className="gap-0 mb-1">
                  {customerBreakdown.slice(0, 6).map((customer: any) => (
                    <Link
                      key={customer.id}
                      href={`/home/services/customers${queryString}`}
                      className="block"
                    >
                      <CardWidgetListItem
                        title={customer.name}
                        subtitle={
                          customer.email ||
                          customer.organization ||
                          'No contact context'
                        }
                        badge={<Badge className="bg-(--color-ticket-status-open) rounded-none text-[11px] dark:text-white">{customer.openTickets} open</Badge>}
                        metadata={
                          <span>
                            {customer.totalTickets} total ·{' '}
                            {formatHours(customer.loggedSeconds)} logged
                          </span>
                        }
                        className="gap-0 border-l-0 border-r-0 border-t-0 rounded-none"
                        isBadgeVerticalCenter={true}
                      />
                    </Link>
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Oldest Open Tickets"
            description="Tickets most likely to need attention."
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className="py-0 max-h-[280px] overflow-auto">
              {openTicketAging.length === 0 ? (
                <EmptyState label="No open tickets." />
              ) : (
                <CardWidgetList className="gap-0 mb-1">
                  {openTicketAging.slice(0, 6).map((ticket: any) => (
                    <Link
                      key={ticket.id}
                      href={`/home/services/tickets/${ticket.id}`}
                      className="block"
                    >
                      <CardWidgetListItem
                        title={`#${ticket.ticketNumber} ${ticket.subject}`}
                        subtitle={`${ticket.customer} · ${ticket.assignee}`}
                        className="gap-0 border-l-0 border-r-0 border-t-0 rounded-none"
                        titleClassFormat="secondary-text-small-semibold !font-bold"
                        badge={
                          <span className={cn('text-[11px] font-normal', ticket.daysOpen >= 25 && 'text-(--color-ticket-priority-critical-text) font-bold')}>
                            {ticket.daysOpen}d open
                          </span>
                        }
                      />
                    </Link>
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>
        </div>
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
    <div className="space-y-4 mt-2">
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
