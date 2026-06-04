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
    { label: 'Total Tickets', value: data?.totalTickets ?? 0, icon: Inbox },
    {
      label: 'Open Tickets',
      value: data?.openTickets ?? 0,
      icon: AlertTriangle,
    },
    { label: 'Customers', value: data?.customers ?? 0, icon: UserRound },
    { label: 'Teams', value: teamBreakdown.length, icon: UsersRound },
    {
      label: 'Logged Time',
      value: formatHours(data?.totalLoggedSeconds ?? 0),
      icon: Clock3,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_35%),linear-gradient(135deg,_#102a43,_#0f766e_55%,_#172554)] p-6 text-white shadow-xl">
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
            <Card key={card.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.label}
                </CardTitle>
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
              <CardTitle>Ticket Status Distribution</CardTitle>
              <CardDescription>
                How many tickets are currently sitting in each status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Customer-Specific Workload</CardTitle>
              <CardDescription>
                Customers with active/open tickets and total support effort.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
                    <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-teal-600"
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ticket Time Investment</CardTitle>
              <CardDescription>
                Tickets consuming the most logged support time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-cyan-600"
                        style={{
                          width: percent(ticket.loggedSeconds, timeMax),
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Priority Mix</CardTitle>
              <CardDescription>Open pressure by priority.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {priorityBreakdown.length === 0 ? (
                <EmptyReport label="No priority data." />
              ) : (
                priorityBreakdown.map((priority: any) => (
                  <div
                    key={priority.id}
                    className="flex items-center justify-between rounded-xl border p-3"
                  >
                    <div>
                      <div className="font-medium">{priority.name}</div>
                      <div className="text-muted-foreground text-xs">
                        {priority.openCount} open
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
              <CardTitle>Assignee Workload</CardTitle>
              <CardDescription>
                Ticket ownership and actual time logged by agents.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Workload</CardTitle>
              <CardDescription>
                Tickets and effort by support team.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
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
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Oldest Open Tickets</CardTitle>
            <CardDescription>
              Open tickets sorted by age so overdue work is visible.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Time Logs By Ticket</CardTitle>
            <CardDescription>
              Where time is being spent, based on individual time entries.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
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
          </CardContent>
        </Card>
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
      <div className="bg-muted h-2 overflow-hidden rounded-full">
        <div className="h-full rounded-full bg-sky-600" style={{ width }} />
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
