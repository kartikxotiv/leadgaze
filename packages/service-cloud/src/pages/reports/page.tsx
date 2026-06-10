'use client';

import Link from 'next/link';

import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Clock3,
  Inbox,
  UserRound,
  UsersRound,
} from 'lucide-react';

import { Badge } from '@kit/ui/badge';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
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

export function ServiceCloudReportsPage({
  workspaceId,
}: {
  workspaceId: string;
}) {
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

  if (isPermissionLoading) {
    return (
      <div className="text-muted-foreground p-6 text-sm">
        Checking permissions...
      </div>
    );
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
  const teamBreakdown = reports.teamBreakdown ?? [];
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
    },
    {
      label: 'Open Tickets',
      value: data?.openTickets ?? 0,
      icon: AlertTriangle,
      detail: 'Unresolved customer work',
      iconBg: 'bg-activity-4',
    },
    {
      label: 'Customers',
      value: data?.customers ?? 0,
      icon: UserRound,
      detail: 'Support customer records',
      iconBg: 'bg-activity-5',
    },
    {
      label: 'Teams',
      value: teamBreakdown.length,
      icon: UsersRound,
      detail: 'Active support teams',
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
      <section className="overflow-hidden rounded-none border bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_35%),linear-gradient(135deg,_#102a43,_#0f766e_55%,_#172554)] p-6 text-white shadow-xl">
        <div className="max-w-3xl">
          <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
            Service Intelligence
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Support reports
          </h1>
          <p className="mt-2 text-sm leading-6 text-white/75">
            Ticket volume, customer workload, assignment pressure, and time
            investment across the service operation.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="h-32 xl:h-28 2xl:h-32 flex flex-col justify-between">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 xl:p-3 xl:pb-0 2xl:p-5 2xl:pb-0">
                <div className="space-y-1">
                  <CardTitle className="secondary-text-small text-leadgaze-muted dark:text-white">
                    {card.label}
                  </CardTitle>
                  <div className="primary-heading-number text-leadgaze-dark dark:text-zinc-100">
                    {isLoading ? '...' : card.value}
                  </div>
                </div>
                <div className={`flex h-8 w-8 items-center justify-center rounded ${card.iconBg}`}>
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
            title="Ticket Status Distribution"
            description="How many tickets are currently sitting in each status."
          >
            <div className="space-y-4 px-6 py-4">
              {statusBreakdown.length === 0 ? (
                <EmptyReport label="No ticket statuses found." />
              ) : (
                statusBreakdown.map((status: any) => (
                  <MetricBar
                    key={status.id}
                    label={status.name}
                    description={`${status.lifecycle ?? 'workflow'} · ${formatHours(status.loggedSeconds ?? 0)} logged`}
                    value={status.count}
                    width={percent(status.count, statusMax)}
                  />
                ))
              )}
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Customer-Specific Workload"
            description="Customers with active/open tickets and total support effort."
            hideHeaderBorder={true}
          >
            <ReportTable
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
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-muted-foreground text-xs">
                    {[customer.email, customer.organization]
                      .filter(Boolean)
                      .join(' · ') || 'No contact context'}
                  </div>
                  <div className="bar-bg mt-2 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-leadgaze-success"
                      style={{
                        width: percent(customer.openTickets, customerMax),
                      }}
                    />
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
        </div>

        <aside className="space-y-6">
          <CardWidgetContainer
            title="Priority Mix"
            description="Open pressure by priority."
            hideHeaderBorder={true}
          >
            <div className="px-6 py-4">
              {priorityBreakdown.length === 0 ? (
                <EmptyReport label="No priority data." />
              ) : (
                <CardWidgetList>
                  {priorityBreakdown.map((priority: any) => (
                    <CardWidgetListItem
                      key={priority.id}
                      title={priority.name}
                      subtitle={`${priority.openCount} open`}
                      badge={<Badge variant="secondary">{priority.count}</Badge>}
                    />
                  ))}
                </CardWidgetList>
              )}
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Assignee Workload"
            description="Ticket ownership and actual time logged by agents."
            hideHeaderBorder={true}
          >
            <ReportTable
              headers={['Agent', 'Open', 'Total', 'Logged']}
              empty="No assignee data."
              rows={assigneeWorkload
                .slice(0, 10)
                .map((assignee: any) => [
                  assignee.name,
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
            title="Team Workload"
            description="Tickets and effort by support team."
            hideHeaderBorder={true}
          >
            <ReportTable
              headers={['Team', 'Open', 'Total', 'Logged']}
              empty="No team data."
              rows={teamBreakdown
                .slice(0, 10)
                .map((team: any) => [
                  team.name,
                  team.openTickets,
                  team.totalTickets,
                  formatHours(team.loggedSeconds),
                ])}
            />
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Ticket Time Investment"
            description="Tickets consuming the most logged support time."
            hideHeaderBorder={true}
          >
            <div className="space-y-4 px-6 py-4">
              {ticketTimeBreakdown.length === 0 ? (
                <EmptyReport label="No logged ticket time yet." />
              ) : (
                ticketTimeBreakdown.map((ticket: any) => (
                  <div key={ticket.id} className="rounded-xl border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/home/services/tickets/${ticket.id}`}
                          className="font-medium hover:underline"
                        >
                          #{ticket.ticketNumber} {ticket.subject}
                        </Link>
                        <div className="text-muted-foreground mt-1 text-xs">
                          {ticket.customer} · {ticket.status} ·{' '}
                          {ticket.assignee}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {formatHours(ticket.loggedSeconds)}
                      </Badge>
                    </div>
                    <div className="bar-bg mt-3 h-2 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-leadgaze-success"
                        style={{
                          width: percent(ticket.loggedSeconds, timeMax),
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardWidgetContainer>
        </aside>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <CardWidgetContainer
          title="Oldest Open Tickets"
          description="Open tickets sorted by age so overdue work is visible."
          hideHeaderBorder={true}
        >
          <ReportTable
            headers={['Ticket', 'Customer', 'Owner', 'Age', 'Due']}
            empty="No open tickets."
            rows={openTicketAging.map((ticket: any) => [
              <Link
                key="ticket"
                href={`/home/services/tickets/${ticket.id}`}
                className="font-medium hover:underline"
              >
                #{ticket.ticketNumber} {ticket.subject}
              </Link>,
              ticket.customer,
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
        >
          <ReportTable
            headers={['Ticket', 'Customer', 'Entries', 'Logged', 'Latest']}
            empty="No time entries logged yet."
            rows={timeByTicket.map((ticket: any) => [
              ticket.id ? (
                <Link
                  key="ticket"
                  href={`/home/services/tickets/${ticket.id}`}
                  className="font-medium hover:underline"
                >
                  #{ticket.ticketNumber} {ticket.subject}
                </Link>
              ) : (
                ticket.subject
              ),
              ticket.customer,
              ticket.entries,
              formatHours(ticket.loggedSeconds),
              formatDate(ticket.latestLoggedDate),
            ])}
          />
        </CardWidgetContainer>
      </div>
    </div>
  );
}

function MetricBar({
  label,
  description,
  value,
  width,
}: {
  label: string;
  description: string;
  value: number;
  width: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-muted-foreground text-xs">{description}</div>
        </div>
        <div className="text-2xl font-semibold">{value}</div>
      </div>
      <div className="h-2 w-full overflow-hidden bar-bg rounded-full">
        <div
          className="h-full rounded-full bg-leadgaze-success transition-all duration-500"
          style={{ width }}
        />
      </div>
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground border-b text-left text-xs uppercase">
          <tr>
            {headers.map((header) => (
              <th key={header} className="p-3 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                className="text-muted-foreground p-6 text-center"
                colSpan={headers.length}
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-b last:border-b-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="p-3 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function EmptyReport({ label }: { label: string }) {
  return (
    <div className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
      {label}
    </div>
  );
}
