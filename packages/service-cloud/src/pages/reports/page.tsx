'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Clock3, Inbox, UserRound } from 'lucide-react';

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
import { useColumnResize } from '@kit/ui/use-column-resize';
import { cn } from '@kit/ui/utils';

import { getServiceCloudDashboardService } from '../../services';
import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';
import { ServiceCloudAccessDenied } from '../_components/access-denied';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@kit/ui/table';

function formatHours(seconds: number) {
  return `${Math.round((Number(seconds || 0) / 3600) * 10) / 10}h`;
}

function maxCount(rows: any[], key: string) {
  return Math.max(1, ...rows.map((row) => Number(row[key] ?? 0)));
}

function percent(value: number, max: number) {
  return `${Math.min(100, Math.round((Number(value || 0) / max) * 100))}%`;
}

export function ServiceCloudReportsPage({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { formatDate } = useLocalization();
  const { canAccess, isLoading: isPermissionLoading } =
    useServiceCloudPermissions(workspaceId);
  const canView = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.reports,
    SERVICE_CLOUD_FEATURE_KEYS.view,
  );
  const { data, isLoading } = useQuery({
    queryKey: ['service-cloud', 'reports', workspaceId],
    queryFn: () => getServiceCloudDashboardService(workspaceId),
    enabled: Boolean(workspaceId && canView),
  });

  if (isPermissionLoading || isLoading) {
    return <ServiceCloudReportsSkeleton />;
  }

  if (!canView) {
    return <ServiceCloudAccessDenied label="reports" />;
  }

  const reports = data?.reports ?? {};
  const statusBreakdown = reports.statusBreakdown ?? [];
  const priorityBreakdown = reports.priorityBreakdown ?? [];
  const customerBreakdown = reports.customerBreakdown ?? [];
  const ticketTimeBreakdown = reports.ticketTimeBreakdown ?? [];
  const assigneeWorkload = reports.assigneeWorkload ?? [];
  const openTicketAging = reports.openTicketAging ?? [];
  const timeByTicket = reports.timeByTicket ?? [];
  const statusMax = maxCount(statusBreakdown, 'count');
  const customerMax = maxCount(customerBreakdown, 'openTickets');
  const timeMax = maxCount(ticketTimeBreakdown, 'loggedSeconds');

  const cards = [
    {
      label: 'Total Tickets',
      value: data?.totalTickets ?? 0,
      icon: Inbox,
      detail: 'All active service tickets',
      iconBg: 'bg-primary dark:bg-primary',
      detailClassName: 'text-leadgaze-primary',
    },
    {
      label: 'Open Tickets',
      value: data?.openTickets ?? 0,
      icon: AlertTriangle,
      detail: 'Unresolved customer work',
      iconBg: 'bg-activity-4',
      detailClassName: 'text-[#BA1A1A]',
    },
    {
      label: 'Customers',
      value: data?.customers ?? 0,
      icon: UserRound,
      detail: 'Support customer records',
      iconBg: 'bg-activity-5',
      detailClassName: 'text-leadgaze-primary',
    },
    {
      label: 'Logged Time',
      value: formatHours(data?.totalLoggedSeconds ?? 0),
      icon: Clock3,
      detail: 'Tracked support effort',
      iconBg: 'bg-activity-6',
      detailClassName: 'text-leadgaze-dark dark:text-white',
    },
  ];

  return (
    <div className="space-y-2 mt-0">


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="flex h-32 flex-col justify-between xl:h-28 2xl:h-32"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 pb-2">
                <div className="space-y-1">
                  <CardTitle className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">
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
              <CardContent className="px-4">
                <CardDescription className={cn("secondary-text-small", card.detailClassName || "text-leadgaze-success")}>
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
            title="Ticket Status Distribution"
            description="How many tickets are currently sitting in each status."
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className="space-y-4 px-2 py-2 min-h-[315px] max-h-[460px] overflow-auto">
              {statusBreakdown.length === 0 ? (
                <EmptyReport label="No ticket statuses found." />
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

                  return (
                    <MetricBar
                      key={status.id}
                      label={status.name}
                      description={`${formatHours(status.loggedSeconds ?? 0)} logged`}
                      value={status.count}
                      width={percent(status.count, statusMax)}
                      barColor={barColor}
                    />
                  );
                })
              )}
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Customer-Specific Workload"
            description="Customers with active/open tickets and total support effort."
            hideHeaderBorder={true}
            hideBorderBottom={true}
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <ReportTable
              tableKey="sc-report-customer-workload"
              headers={[
                'Customer',
                'Open',
                'Total',
                'Closed',
                'Logged',
                'Latest',
              ]}
              empty="No customer ticket data yet."
              rows={customerBreakdown.slice(0, 12).map((customer: any) => [
                <div key="customer">
                  <Link
                    href="/home/services/customers"
                    className="secondary-text-small-semibold hover:underline "
                  >
                    {customer.name}
                  </Link>
                  <div className="text-muted-foreground text-xs mt-0.5 !font-normal">
                    {[customer.email, customer.organization]
                      .filter(Boolean)
                      .join(' · ') || 'No contact context'}
                  </div>
                </div>,
                customer.openTickets,
                customer.totalTickets,
                customer.closedTickets,
                formatHours(customer.loggedSeconds),
                formatDate(customer.latestTicketAt),
              ])}
            />
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Oldest Open Tickets"
            description="Open tickets sorted by age so overdue work is visible."
            hideHeaderBorder={true}
            hideBorderBottom={true}
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <ReportTable
              tableKey="sc-report-oldest-tickets"
              headers={['Ticket', 'Customer', 'Owner', 'Age', 'Due']}
              empty="No open tickets."
              rows={openTicketAging.map((ticket: any) => [
                <Link
                  key="ticket"
                  href={`/home/services/tickets/${ticket.id}`}
                  className="secondary-text-small-semibold w-[300px] truncate inline-block hover:underline"
                  style={{ color: 'var(--color-report-blue-text)' }}
                >
                  #{ticket.ticketNumber} {ticket.subject}
                </Link>,
                <Link
                  key={`customer-${ticket.id}`}
                  href="/home/services/customers"
                  className="hover:underline hover:text-primary"
                >
                  {ticket.customer}
                </Link>,
                ticket.assignee,
                `${ticket.daysOpen}d`,
                formatDate(ticket.dueDate),
              ])}
            />
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Time Logs By Ticket"
            description="Where time is being spent, based on individual time entries."
            hideHeaderBorder={true}
            hideBorderBottom={true}
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <ReportTable
              tableKey="sc-report-time-logs"
              headers={['Ticket', 'Customer', 'Entries', 'Logged', 'Latest']}
              empty="No time entries logged yet."
              rows={timeByTicket.map((ticket: any) => [
                ticket.id ? (
                  <Link
                    key="ticket"
                    href={`/home/services/tickets/${ticket.id}`}
                    className="secondary-text-small-semibold w-[300px] truncate inline-block hover:underline"
                  >
                    #{ticket.ticketNumber} {ticket.subject}
                  </Link>
                ) : (
                  ticket.subject
                ),
                <Link
                  key={`customer-${ticket.id || ticket.subject}`}
                  href="/home/services/customers"
                  className="hover:underline hover:text-primary"
                >
                  {ticket.customer}
                </Link>,
                ticket.entries,
                formatHours(ticket.loggedSeconds),
                formatDate(ticket.latestLoggedDate),
              ])}
            />
          </CardWidgetContainer>
        </div>

        <div className="space-y-2 w-full lg:w-[35%]">
          <CardWidgetContainer
            title="Priority Mix"
            description="Open pressure by priority."            
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className="px-2 py-2 overflow-auto max-h-[380px]">
              {priorityBreakdown.length === 0 ? (
                <EmptyReport label="No priority data." />
              ) : (
                <div className="space-y-2">
                  {priorityBreakdown.map((priority: any) => {
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
                          <div className="secondary-text-small mt-1" style={{ color: subTextColor || 'var(--color-leadgaze-muted)' }}>{`${priority.openCount} open`}</div>
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
            title="Assignee Workload"
            description="Ticket ownership and actual time logged by agents."
            hideHeaderBorder={true}
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <ReportTable
              tableKey="sc-report-assignee-workload"
              headers={['Agent', 'Open', 'Total', 'Logged']}
              empty="No assignee data."
              rows={assigneeWorkload
                .slice(0, 10)
                .map((assignee: any) => [
                  assignee.name?.toLowerCase() === 'unassigned' ? (
                    <span>{assignee.name}</span>
                  ) : (
                    <span style={{ color: 'var(--color-report-blue-text)' }} className="font-medium">
                      {assignee.name}
                    </span>
                  ),
                  assignee.openTickets,
                  assignee.totalTickets,
                  formatHours(
                    assignee.actualLoggedSeconds ||
                      assignee.ticketLoggedSeconds,
                  ),
                ])}
            />
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Ticket Time Investment"
            description="Tickets consuming the most logged support time."            
            headerClassName="p-2 xl:p-2 2xl:p-2"
          >
            <div className="overflow-auto max-h-[320px]">
              {ticketTimeBreakdown.length === 0 ? (
                <EmptyReport label="No logged ticket time yet." />
              ) : (
                ticketTimeBreakdown.map((ticket: any) => {
                  const pctRaw = timeMax > 0 ? (Number(ticket.loggedSeconds || 0) / timeMax) * 100 : 0;
                  let barColor = 'var(--color-report-blue-text)';
                  if (pctRaw <= 15) barColor = 'var(--color-ticket-status-in-progress)';
                  else if (pctRaw <= 40) barColor = 'var(--color-ticket-status-open)';

                  return (
                  <div key={ticket.id} className="p-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/home/services/tickets/${ticket.id}`}
                          className="secondary-text-small-semibold w-[300px] truncate block hover:underline"
                          style={{ color: 'var(--color-report-blue-text)' }}
                        >
                          #{ticket.ticketNumber} {ticket.subject}
                        </Link>
                        <div className="text-muted-foreground mt-0 text-xs">
                          {ticket.customer} · {ticket.status} ·{' '}
                          {ticket.assignee}
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-none border-0 text-leadgaze-dark dark:text-white">
                        {formatHours(ticket.loggedSeconds)}
                      </Badge>
                    </div>
                    <div className="bar-bg mt-2 h-2 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: percent(ticket.loggedSeconds, timeMax),
                          backgroundColor: barColor
                        }}
                      />
                    </div>
                  </div>
                )})
              )}
            </div>
          </CardWidgetContainer>
        </div>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  description,
  value,
  width,
  barColor = 'bg-leadgaze-success',
}: {
  label: string;
  description: string;
  value: number;
  width: string;
  barColor?: string;
}) {
  const isCustomColor = barColor.startsWith('var(') || barColor.startsWith('#');
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <span className="secondary-text-small-semibold text-leadgaze-dark dark:text-white">{label}</span>
          <span className="text-muted-foreground text-xs">•</span>
          <span className="text-muted-foreground text-xs">{description}</span>
        </div>
        <div className="secondary-text-small-semibold font-bold text-leadgaze-dark dark:text-white">{value}</div>
      </div>
      <div className="bar-bg h-2 w-full overflow-hidden rounded-full bg-[#EDEEF0]">
        <div
          className={`h-full rounded-full transition-all duration-500 ${!isCustomColor ? barColor : ''}`}
          style={{ 
            width, 
            ...(isCustomColor ? { backgroundColor: barColor } : {})
          }}
        />
      </div>
    </div>
  );
}

function ReportTable({
  tableKey,
  headers,
  rows,
  empty,
}: {
  tableKey: string;
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  empty: string;
}) {
  const { getHeaderProps, getResizeHandleProps } = useColumnResize(tableKey);

  return (
    <div className="overflow-auto max-h-[350px]">
      <Table>
        <TableHeader className="text-left text-xs uppercase">
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header} className="relative p-2 secondary-text-small-semibold" {...getHeaderProps(header)}>
                {header}
                <span className="col-resize-handle" {...getResizeHandleProps(header)} />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                className="text-muted-foreground p-6 text-center"
                colSpan={headers.length}
              >
                {empty}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow key={index} className="border-b last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <TableCell key={cellIndex} className="p-2 align-top secondary-text-small-semibold">
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function EmptyReport({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground rounded-xl border border-dashed p-2 text-center text-sm">
      {label}
    </div>
  );
}

function ServiceCloudReportsSkeleton() {
  return (
    <div className="space-y-4 mt-2">
      {/* Stat cards skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
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

      {/* Main grid: left + right aside */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Status Distribution skeleton */}
          <Card>
            <CardHeader className="border-b">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="mt-1 h-3 w-64" />
            </CardHeader>
            <div className="space-y-4 px-6 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-7 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </Card>

          {/* Customer Workload table skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-1 h-3 w-64" />
            </CardHeader>
            <div className="overflow-x-auto">
              {/* Table header */}
              <div className="bg-[#EDEEF0] grid grid-cols-6 gap-3 border-b px-3 py-2">
                {[
                  'Customer',
                  'Open',
                  'Total',
                  'Closed',
                  'Logged',
                  'Latest',
                ].map((h) => (
                  <Skeleton key={h} className="h-3 w-full max-w-[60px]" />
                ))}
              </div>
              {/* Table rows */}
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="grid grid-cols-6 gap-3 border-b px-3 py-3 last:border-b-0"
                >
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-2.5 w-32" />
                    <Skeleton className="mt-1 h-1.5 w-full rounded-full" />
                  </div>
                  {[1, 2, 3, 4, 5].map((j) => (
                    <Skeleton key={j} className="h-3.5 w-8" />
                  ))}
                </div>
              ))}
            </div>
          </Card>

          {/* Oldest Open Tickets skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-1 h-3 w-56" />
            </CardHeader>
            <div className="overflow-x-auto">
              <div className="bg-[#EDEEF0] grid grid-cols-5 gap-3 border-b px-3 py-2">
                {['Ticket', 'Customer', 'Owner', 'Age', 'Due'].map((h) => (
                  <Skeleton key={h} className="h-3 w-full max-w-[48px]" />
                ))}
              </div>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="grid grid-cols-5 gap-3 border-b px-3 py-3 last:border-b-0"
                >
                  <Skeleton
                    className={`h-3.5 ${i % 2 === 0 ? 'w-32' : 'w-28'}`}
                  />
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton className="h-3.5 w-8" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))}
            </div>
          </Card>

          {/* Time Logs By Ticket skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-1 h-3 w-56" />
            </CardHeader>
            <div className="overflow-auto max-h-[350px]">
              <div className="bg-[#EDEEF0] grid grid-cols-5 gap-3 border-b px-3 py-2">
                {['Ticket', 'Customer', 'Entries', 'Logged', 'Latest'].map(
                  (h) => (
                    <Skeleton key={h} className="h-3 w-full max-w-[48px]" />
                  ),
                )}
              </div>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="grid grid-cols-5 gap-3 border-b px-3 py-3 last:border-b-0"
                >
                  <Skeleton
                    className={`h-3.5 ${i % 2 === 0 ? 'w-28' : 'w-36'}`}
                  />
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-8" />
                  <Skeleton className="h-3.5 w-10" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right aside */}
        <aside className="space-y-6">
          {/* Priority Mix */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
              <Skeleton className="mt-1 h-3 w-36" />
            </CardHeader>
            <div className="space-y-3 px-6 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
              ))}
            </div>
          </Card>

          {/* Assignee Workload table skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-1 h-3 w-56" />
            </CardHeader>
            <div className="overflow-x-auto">
              <div className="bg-[#EDEEF0] grid grid-cols-4 gap-3 border-b px-3 py-2">
                {['Agent', 'Open', 'Total', 'Logged'].map((h) => (
                  <Skeleton key={h} className="h-3 w-full max-w-[48px]" />
                ))}
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 gap-3 border-b px-3 py-3 last:border-b-0"
                >
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-6" />
                  <Skeleton className="h-3.5 w-6" />
                  <Skeleton className="h-3.5 w-10" />
                </div>
              ))}
            </div>
          </Card>

          {/* Ticket Time Investment */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
              <Skeleton className="mt-1 h-3 w-56" />
            </CardHeader>
            <div className="space-y-3 px-6 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2 rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
