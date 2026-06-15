'use client';

import { useState } from 'react';
import type React from 'react';

import Link from 'next/link';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock3,
  Flag,
  Inbox,
  Mail,
  Paperclip,
  Pencil,
  Tag,
  Timer,
  Trash2,
  UserCheck,
  UserRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { CoreEmailReplyDialog, CoreEntityPanel } from '@kit/core/pages';
import { getCoreEmailAccountsService } from '@kit/core/services';
import { formatDate, formatDateOnly, formatDateTime } from '@kit/shared/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@kit/ui/alert-dialog';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Separator } from '@kit/ui/separator';
import { Skeleton } from '@kit/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';

import {
  createServiceCloudResourceService,
  deleteServiceCloudResourceService,
  getServiceCloudTicketDetailService,
  logServiceCloudTicketTimeService,
  updateServiceCloudResourceService,
} from '../../services';
import CustomTableContainer from '@kit/ui/custom-table-container';
import { PageBody } from '@kit/ui/page';
import { cn } from '@kit/ui/utils';
import {
  SERVICE_CLOUD_FEATURE_KEYS,
  SERVICE_CLOUD_MODULE_KEYS,
  useServiceCloudPermissions,
} from '../../utils';

type LookupOption = {
  id: string;
  name?: string | null;
  email?: string | null;
  color?: string | null;
  lifecycle?: string | null;
  severity_order?: number | null;
};

function formatDateInput(value?: string | null) {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

function emailRecipientText(email: any) {
  if (Array.isArray(email?.to_emails)) return email.to_emails.join(', ');
  return email?.to_email ?? '-';
}

function optionLabel(option?: LookupOption | null) {
  return option?.name || option?.email || 'Unassigned';
}

function actorLabel(activity: any) {
  return activity?.actor?.name || activity?.actor?.email || 'System';
}

function eventLabel(eventType?: string | null) {
  return String(eventType || 'activity')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function priorityTone(priority?: LookupOption | null) {
  const key = `${priority?.name ?? ''}`.toLowerCase();
  if (key.includes('urgent') || key.includes('critical')) {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-950 dark:bg-red-950/30 dark:text-red-300';
  }
  if (key.includes('high')) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-950 dark:bg-amber-950/30 dark:text-amber-300';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300';
}

export function ServiceCloudTicketDetailPage({
  workspaceId,
  ticketId,
}: {
  workspaceId: string;
  ticketId: string;
}) {
  const queryClient = useQueryClient();
  const { canAccess, isLoading: permissionsLoading } =
    useServiceCloudPermissions(workspaceId);
  const canManageInbox = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.inboxes,
    SERVICE_CLOUD_FEATURE_KEYS.manageInbox,
  );
  const queryKey = ['service-cloud', 'ticket-detail', workspaceId, ticketId];
  const [timeForm, setTimeForm] = useState({
    hours: '',
    minutes: '',
    description: '',
    activities: '',
  });
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    hours: '',
    minutes: '',
    description: '',
    activities: '',
  });
  const [replyEmail, setReplyEmail] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getServiceCloudTicketDetailService(workspaceId, ticketId),
    enabled: Boolean(workspaceId && ticketId),
  });

  const { data: emailAccounts = [] } = useQuery({
    queryKey: ['core-email-accounts', workspaceId],
    queryFn: () => getCoreEmailAccountsService(workspaceId),
    enabled: Boolean(workspaceId && canManageInbox),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      updateServiceCloudResourceService('tickets', {
        id: ticketId,
        workspace_id: workspaceId,
        ...payload,
      }),
    onSuccess: async () => {
      toast.success('Ticket updated');
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) =>
      toast.error(error.message || 'Failed to update ticket'),
  });

  const timeMutation = useMutation({
    mutationFn: () => {
      const durationSeconds =
        Number(timeForm.hours || 0) * 3600 + Number(timeForm.minutes || 0) * 60;

      return logServiceCloudTicketTimeService(workspaceId, ticketId, {
        durationSeconds,
        description: timeForm.description,
        activities: timeForm.activities,
      });
    },
    onSuccess: async () => {
      toast.success('Time logged');
      setTimeForm({ hours: '', minutes: '', description: '', activities: '' });
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to log time'),
  });

  const deleteTimeMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteServiceCloudResourceService('time-entries', workspaceId, id);
    },
    onSuccess: async () => {
      toast.success('Time entry deleted successfully');
      setDeletingLogId(null);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Failed to delete time entry'),
  });

  const updateTimeMutation = useMutation({
    mutationFn: () => {
      const durationSeconds =
        Number(editForm.hours || 0) * 3600 + Number(editForm.minutes || 0) * 60;

      return updateServiceCloudResourceService('time-entries', {
        id: editingLogId,
        workspace_id: workspaceId,
        duration_seconds: durationSeconds,
        description: editForm.description,
        activities: editForm.activities,
      });
    },
    onSuccess: async () => {
      toast.success('Time entry updated');
      setEditingLogId(null);
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) =>
      toast.error(error.message || 'Failed to update time entry'),
  });

  const handleEditClick = (entry: any) => {
    const hours = Math.floor((entry.duration_seconds || 0) / 3600);
    const minutes = Math.round(((entry.duration_seconds || 0) % 3600) / 60);
    setEditForm({
      hours: hours > 0 ? String(hours) : '',
      minutes: minutes > 0 ? String(minutes) : '',
      description: entry.description || '',
      activities: entry.activities || '',
    });
    setEditingLogId(entry.id);
  };

  const assigneeMutation = useMutation({
    mutationFn: async ({
      accountId,
      assigneeId,
      action,
    }: {
      accountId: string;
      assigneeId?: string;
      action: 'add' | 'remove';
    }) => {
      if (action === 'remove' && assigneeId) {
        return deleteServiceCloudResourceService(
          'ticket-assignees',
          workspaceId,
          assigneeId,
        );
      }

      return createServiceCloudResourceService('ticket-assignees', {
        workspace_id: workspaceId,
        ticket_id: ticketId,
        account_id: accountId,
        assignment_role: 'collaborator',
      });
    },
    onSuccess: async () => {
      toast.success('Assignees updated');
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) =>
      toast.error(error.message || 'Failed to update assignees'),
  });

  if (isLoading || permissionsLoading) {
    return <ServiceCloudTicketDetailSkeleton />;
  }

  if (!data?.ticket) {
    return (
      <div className="text-muted-foreground p-6 text-sm">Ticket not found.</div>
    );
  }

  const ticket = data.ticket;
  const emails = data.emails ?? [];
  const timeEntries = data.timeEntries ?? [];
  const assignees = data.assignees ?? [];
  const lookups = data.lookups ?? {};
  const statuses = lookups.statuses ?? [];
  const priorities = lookups.priorities ?? [];
  const categories = lookups.categories ?? [];
  const members = lookups.members ?? [];
  const assignedAgent = members.find(
    (member: LookupOption) => member.id === ticket.assigned_agent_id,
  );
  const ticketTemplateContext = {
    module_name: 'Service Cloud',
    ticket_id: ticket.id,
    ticket_number: ticket.ticket_number
      ? `#${ticket.ticket_number}`
      : ticket.id,
    ticket_subject: ticket.subject ?? '',
    ticket_description: ticket.description ?? '',
    ticket_status: ticket.status?.name ?? '',
    ticket_priority: ticket.priority?.name ?? '',
    ticket_category: ticket.category?.name ?? '',
    ticket_due_date: ticket.due_date ?? ticket.due_at ?? '',
    customer_name: ticket.customer?.name ?? '',
    customer_email: ticket.customer?.email ?? '',
    customer_phone: ticket.customer?.phone ?? '',
    organization_name: ticket.organization?.name ?? '',
    assigned_agent_name: assignedAgent?.name ?? '',
    assigned_agent_email: assignedAgent?.email ?? '',
  };
  const latestThreadEmail = [...emails]
    .reverse()
    .map((item: any) => item.email)
    .find(Boolean);
  const totalLoggedSeconds = timeEntries.reduce(
    (sum: number, entry: any) => sum + Number(entry.duration_seconds ?? 0),
    0,
  );
  const canLogTime =
    Number(timeForm.hours || 0) > 0 || Number(timeForm.minutes || 0) > 0;
  const isUpdating = updateMutation.isPending;
  const dueValue =
    ticket.due_date ??
    ticket.due_at ??
    (ticket.created_at && ticket.priority?.resolution_due_minutes
      ? new Date(
          new Date(ticket.created_at).getTime() +
            ticket.priority.resolution_due_minutes * 60 * 1000,
        ).toISOString()
      : null);
  const responseDueAt =
    ticket.response_due_at ||
    (ticket.created_at && ticket.priority?.response_due_minutes
      ? new Date(
          new Date(ticket.created_at).getTime() +
            ticket.priority.response_due_minutes * 60 * 1000,
        ).toISOString()
      : null);

  const updateTicket = (payload: Record<string, unknown>) =>
    updateMutation.mutate(payload);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-none border bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(135deg,_#0f172a,_#164e63_52%,_#0f172a)] p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl space-y-5">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="w-fit bg-white/10 text-white hover:bg-white/20"
            >
              <Link href="/home/services/tickets">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to tickets
              </Link>
            </Button>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                  #{ticket.ticket_number}
                </Badge>
                <Badge className="border-emerald-300/30 bg-emerald-400/15 text-emerald-100 flex items-center gap-1.5 font-medium">
                  {ticket.status?.color ? (
                    <span
                      className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse"
                      style={{ backgroundColor: ticket.status.color }}
                    />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                  {ticket.status?.name ?? 'Open'}
                </Badge>
                {ticket.priority?.name ? (
                  <Badge className="border-white/20 bg-white/15 text-white flex items-center gap-1.5 font-medium">
                    {ticket.priority?.color ? (
                      <span
                        className="h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: ticket.priority.color }}
                      />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                    )}
                    {ticket.priority.name}
                  </Badge>
                ) : null}
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/75">
                  Created {formatDateTime(ticket.created_at)}
                </span>
                {ticket.priority?.resolution_due_minutes ? (
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/75">
                    SLA: {ticket.priority.resolution_due_minutes} mins
                  </span>
                ) : null}
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
                  {ticket.subject}
                </h1>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur md:min-w-[360px]">
            <Metric
              label="Customer"
              value={ticket.customer?.name ?? '-'}
              muted
            />
            <Metric
              label="Primary owner"
              value={optionLabel(assignedAgent)}
              muted
            />
            <Metric label="Due date" value={formatDate(dueValue)} muted />
            <Metric
              label="Logged"
              value={formatDuration(totalLoggedSeconds)}
              muted
            />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        <main className="space-y-6">
          <CardWidgetContainer
            title="Ticket Workspace"
            description="Customer conversation, internal work, attachments, and service timeline."
            icon={<Inbox className="h-5 w-5 text-cyan-600" />}
            icon2={
              <div className="flex flex-wrap gap-2">
                {canManageInbox && latestThreadEmail ? (
                  <Button
                    size="sm"
                    onClick={() => setReplyEmail(latestThreadEmail)}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Reply in thread
                  </Button>
                ) : null}
                <StatusPill label={ticket.source ?? 'manual'} />
                {canManageInbox ? (
                  <StatusPill label={`${emails.length} emails`} />
                ) : null}
                <StatusPill label={formatDuration(totalLoggedSeconds)} />
              </div>
            }
          >
            <div className="px-6 py-4">
              <Tabs
                defaultValue={canManageInbox ? 'conversation' : 'work'}
                className="space-y-5"
              >
                <TabsList
                  className={`grid h-auto grid-cols-2 rounded-2xl bg-slate-100 p-1 md:w-fit ${
                    canManageInbox ? 'md:grid-cols-5' : 'md:grid-cols-4'
                  } dark:bg-slate-900`}
                >
                  {canManageInbox ? (
                    <TabsTrigger value="conversation">Conversation</TabsTrigger>
                  ) : null}
                  <TabsTrigger value="work">Time Log</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                {canManageInbox ? (
                  <TabsContent value="conversation" className="space-y-4">
                    {emails.length === 0 ? (
                      <EmptyState
                        title="No emails linked yet"
                        description="Emails converted into this ticket will appear here."
                      />
                    ) : (
                      <div className="scrollbar-thin h-[calc(100vh-420px)] min-h-[350px] space-y-4 overflow-y-auto pr-2">
                        {emails.map((item: any) => {
                          const email = item.email;
                          return (
                            <article
                              key={item.id}
                              className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-950"
                            >
                              <div className="border-b bg-slate-50 p-4 dark:bg-slate-900/60">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-base font-semibold">
                                      {email?.subject || '(No Subject)'}
                                    </div>
                                    <div className="text-muted-foreground mt-1 text-xs">
                                      {email?.direction === 'inbound'
                                        ? `From ${email?.from_email}`
                                        : `To ${emailRecipientText(email)}`}
                                    </div>
                                    {Array.isArray(email?.cc_emails) &&
                                    email.cc_emails.length > 0 ? (
                                      <div className="text-muted-foreground mt-1 text-xs">
                                        Cc {email.cc_emails.join(', ')}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <Badge variant="outline">
                                      {item.email_role}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setReplyEmail(email)}
                                    >
                                      Reply
                                    </Button>
                                    <span className="text-muted-foreground text-xs">
                                      {formatDateTime(
                                        email?.received_at ||
                                          email?.sent_at ||
                                          email?.created_at,
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="p-5">
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  {email?.html_body || email?.body ? (
                                    <div
                                      dangerouslySetInnerHTML={{
                                        __html: email.html_body || email.body,
                                      }}
                                    />
                                  ) : (
                                    <p>
                                      {email?.text_body ||
                                        email?.snippet ||
                                        'No content.'}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                ) : null}

                <TabsContent value="work" className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <CardWidgetContainer
                      title="Log Time"
                      description="Track work directly against this ticket."
                      icon={<Timer className="h-4 w-4" />}
                      hideHeaderBorder={true}
                    >
                      <div className="space-y-4 px-6 pb-4">
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Hours">
                            <Input
                              type="number"
                              min="0"
                              value={timeForm.hours}
                              onChange={(event) =>
                                setTimeForm((prev) => ({
                                  ...prev,
                                  hours: event.target.value,
                                }))
                              }
                            />
                          </Field>
                          <Field label="Minutes">
                            <Input
                              type="number"
                              min="0"
                              value={timeForm.minutes}
                              onChange={(event) =>
                                setTimeForm((prev) => ({
                                  ...prev,
                                  minutes: event.target.value,
                                }))
                              }
                            />
                          </Field>
                        </div>
                        <Field label="Activities">
                          <Input
                            value={timeForm.activities}
                            onChange={(event) =>
                              setTimeForm((prev) => ({
                                ...prev,
                                activities: event.target.value,
                              }))
                            }
                            placeholder="What activities did you perform?"
                          />
                        </Field>
                        <Field label="Description">
                          <Textarea
                            value={timeForm.description}
                            onChange={(event) =>
                              setTimeForm((prev) => ({
                                ...prev,
                                description: event.target.value,
                              }))
                            }
                            placeholder="What did you work on?"
                          />
                        </Field>
                        <Button
                          className="w-full"
                          disabled={!canLogTime || timeMutation.isPending}
                          onClick={() => timeMutation.mutate()}
                        >
                          <Clock3 className="mr-2 h-4 w-4" />
                          Log Time
                        </Button>
                      </div>
                    </CardWidgetContainer>

                    <CardWidgetContainer
                      title="Time Entries"
                      description={`Total logged: ${formatDuration(totalLoggedSeconds)}`}
                      hideHeaderBorder={true}
                    >
                      <div className="space-y-3 px-6 pb-4">
                        {timeEntries.length === 0 ? (
                          <EmptyState
                            title="No time logged"
                            description="Add time entries as agents work this ticket."
                            compact
                          />
                        ) : (
                          <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
                            <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
                              <CustomTableContainer>
                                <div className="scrollbar-thin max-h-[295px] overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-[80px]">
                                          S. No.
                                        </TableHead>
                                        <TableHead className="max-w-[150px]">
                                          Activities
                                        </TableHead>
                                        <TableHead className="max-w-[200px]">
                                          Description
                                        </TableHead>
                                        <TableHead className="w-[150px]">
                                          Author
                                        </TableHead>
                                        <TableHead className="w-[180px]">
                                          Date &amp; Time Log
                                        </TableHead>
                                        <TableHead className="w-[100px] text-center"></TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {timeEntries.map(
                                        (entry: any, index: number) => (
                                          <TableRow key={entry.id}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell
                                              className="max-w-[150px] truncate"
                                              title={entry.activities || ''}
                                            >
                                              {entry.activities || '-'}
                                            </TableCell>
                                            <TableCell
                                              className="max-w-[200px] truncate"
                                              title={entry.description || ''}
                                            >
                                              {entry.description || '-'}
                                            </TableCell>
                                            <TableCell className="w-[150px]">
                                              <span
                                                className="truncate text-sm"
                                                title={
                                                  entry.author?.name ||
                                                  entry.author?.email ||
                                                  ''
                                                }
                                              >
                                                {entry.author?.name ||
                                                  entry.author?.email ||
                                                  '-'}
                                              </span>
                                            </TableCell>
                                            <TableCell className="w-[180px]">
                                              <div className="flex items-center gap-2">
                                                <span className="whitespace-nowrap">
                                                  {formatDate(
                                                    entry.logged_date,
                                                  )}
                                                </span>
                                                <Badge
                                                  variant="secondary"
                                                  className="whitespace-nowrap"
                                                >
                                                  {formatDuration(
                                                    entry.duration_seconds,
                                                  )}
                                                </Badge>
                                              </div>
                                            </TableCell>
                                            <TableCell className="w-[100px] text-center">
                                              <div className="flex items-center justify-end gap-1">
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  onClick={() =>
                                                    handleEditClick(entry)
                                                  }
                                                >
                                                  <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="text-destructive hover:bg-destructive/10"
                                                  onClick={() =>
                                                    setDeletingLogId(entry.id)
                                                  }
                                                >
                                                  <Trash2 className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        ),
                                      )}
                                    </TableBody>
                                  </Table>
                                </div>
                              </CustomTableContainer>
                            </div>
                          </PageBody>
                        )}
                      </div>
                    </CardWidgetContainer>
                  </div>
                </TabsContent>

                <TabsContent value="notes">
                  <CardWidgetContainer
                    title="Notes"
                    description="Internal notes attached to this ticket."
                    icon={<Paperclip className="h-4 w-4" />}
                    hideHeaderBorder={true}
                  >
                    <div className="px-6 pb-4">
                      <CoreEntityPanel
                        workspaceId={workspaceId}
                        entityType="service_cloud_ticket"
                        entityId={ticketId}
                        capabilities={['notes']}
                      />
                    </div>
                  </CardWidgetContainer>
                </TabsContent>

                <TabsContent value="documents">
                  <CardWidgetContainer
                    title="Documents"
                    description="Attachments and files uploaded to this ticket."
                    icon={<Paperclip className="h-4 w-4" />}
                    hideHeaderBorder={true}
                  >
                    <div className="px-6 pb-4">
                      <CoreEntityPanel
                        workspaceId={workspaceId}
                        entityType="service_cloud_ticket"
                        entityId={ticketId}
                        capabilities={['documents']}
                      />
                    </div>
                  </CardWidgetContainer>
                </TabsContent>

                <TabsContent value="activity">
                  <CardWidgetContainer
                    title="Ticket Activity"
                    description="Status, priority, assignment, email, and time-log history for this ticket."
                    hideHeaderBorder={true}
                  >
                    <div className="scrollbar-thin max-h-[calc(100vh-450px)] min-h-[300px] space-y-3 overflow-y-auto px-6 pr-2 pb-4">
                      {(data.activities ?? []).length === 0 ? (
                        <EmptyState
                          title="No activity yet"
                          description="Ticket changes will be captured here."
                          compact
                        />
                      ) : (
                        data.activities.map((activity: any) => (
                          <div
                            key={activity.id}
                            className="relative rounded-xl border bg-white p-4 shadow-sm dark:bg-zinc-950"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">
                                    {eventLabel(activity.event_type)}
                                  </Badge>
                                  <span className="text-muted-foreground text-xs">
                                    by {actorLabel(activity)}
                                  </span>
                                </div>
                                <div className="font-medium">
                                  {activity.summary ||
                                    eventLabel(activity.event_type)}
                                </div>
                                {activity.from_value?.label ||
                                activity.to_value?.label ? (
                                  <div className="text-muted-foreground text-xs">
                                    {activity.from_value?.label ?? 'None'} -&gt;{' '}
                                    {activity.to_value?.label ?? 'None'}
                                  </div>
                                ) : null}
                              </div>
                              <div className="text-muted-foreground text-right text-xs">
                                {formatDateTime(activity.created_at)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardWidgetContainer>
                </TabsContent>
              </Tabs>
            </div>
          </CardWidgetContainer>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <CardWidgetContainer
            title="Ticket Properties"
            description="Operational fields agents update while working the case."
            hideHeaderBorder={true}
          >
            <div className="space-y-4 px-6 py-4">
              <EditableSelect
                icon={<Flag className="h-4 w-4" />}
                label="Status"
                value={ticket.status_id}
                options={statuses}
                disabled={isUpdating}
                onChange={(value) => updateTicket({ status_id: value })}
              />
              <EditableSelect
                icon={<Flag className="h-4 w-4" />}
                label="Priority"
                value={ticket.priority_id}
                options={priorities}
                disabled={isUpdating}
                allowNone
                onChange={(value) => updateTicket({ priority_id: value })}
              />
              <EditableSelect
                icon={<Tag className="h-4 w-4" />}
                label="Category"
                value={ticket.category_id}
                options={categories}
                disabled={isUpdating}
                allowNone
                onChange={(value) => updateTicket({ category_id: value })}
              />
              <EditableSelect
                icon={<UserCheck className="h-4 w-4" />}
                label="Primary owner"
                value={ticket.assigned_agent_id}
                options={members}
                disabled={isUpdating}
                allowNone
                onChange={(value) => updateTicket({ assigned_agent_id: value })}
              />
              <Field label="Due date">
                <div className="flex items-center gap-2">
                  <CalendarDays className="text-muted-foreground h-4 w-4" />
                  <Input
                    type="date"
                    value={formatDateInput(dueValue)}
                    disabled={isUpdating}
                    onChange={(event) =>
                      updateTicket({ due_date: event.target.value || null })
                    }
                  />
                </div>
              </Field>
              <Separator />
              <TicketAssignees
                members={members}
                assignees={assignees}
                disabled={assigneeMutation.isPending}
                onToggle={(member, assignee) =>
                  assigneeMutation.mutate({
                    accountId: member.id,
                    assigneeId: assignee?.id,
                    action: assignee ? 'remove' : 'add',
                  })
                }
              />
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="SLA Snapshot"
            hideHeaderBorder={true}
            className={priorityTone(ticket.priority)}
          >
            <div className="space-y-3 px-6 py-4 text-sm">
              <Metric
                label="Priority"
                value={ticket.priority?.name ?? 'Not set'}
              />
              <Metric
                label="Response due"
                value={formatDateTime(responseDueAt)}
              />
              <Metric label="Resolution due" value={formatDateOnly(dueValue)} />
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Customer Details"
            icon={<UserRound className="h-4 w-4" />}
            hideHeaderBorder={true}
          >
            <div className="space-y-3 px-6 py-4 text-sm">
              <Metric label="Name" value={ticket.customer?.name ?? '-'} />
              <Metric label="Email" value={ticket.customer?.email ?? '-'} />
              <Metric label="Phone" value={ticket.customer?.phone ?? '-'} />
              <Separator />
              <Metric
                label="Company"
                value={ticket.organization?.name ?? '-'}
              />
              <Metric
                label="Industry"
                value={ticket.organization?.industry ?? '-'}
              />
              <Metric
                label="Website"
                value={ticket.organization?.website ?? '-'}
              />
            </div>
          </CardWidgetContainer>

          <CardWidgetContainer
            title="Record Details"
            icon={<Building2 className="h-4 w-4" />}
            hideHeaderBorder={true}
          >
            <div className="space-y-3 px-6 py-4 text-sm">
              <Metric label="Source" value={ticket.source ?? '-'} />
              <Metric
                label="First response"
                value={formatDateTime(ticket.first_response_at)}
              />
              <Metric
                label="Last customer reply"
                value={formatDateTime(ticket.last_customer_response_at)}
              />
              <Metric
                label="Updated"
                value={formatDateTime(ticket.updated_at)}
              />
            </div>
          </CardWidgetContainer>
        </aside>
      </div>

      {canManageInbox ? (
        <CoreEmailReplyDialog
          open={Boolean(replyEmail)}
          onOpenChange={(open) => {
            if (!open) {
              setReplyEmail(null);
              void queryClient.invalidateQueries({ queryKey });
            }
          }}
          workspaceId={workspaceId}
          email={replyEmail}
          accounts={emailAccounts}
          templateContext={ticketTemplateContext}
        />
      ) : null}

      <Dialog
        open={Boolean(editingLogId)}
        onOpenChange={(open) => {
          if (!open) setEditingLogId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Time Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hours">
                <Input
                  type="number"
                  min="0"
                  value={editForm.hours}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      hours: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Minutes">
                <Input
                  type="number"
                  min="0"
                  value={editForm.minutes}
                  onChange={(event) =>
                    setEditForm((prev) => ({
                      ...prev,
                      minutes: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Activities">
              <Input
                value={editForm.activities}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    activities: event.target.value,
                  }))
                }
                placeholder="What activities did you perform?"
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="What did you work on?"
              />
            </Field>
            <Button
              className="w-full"
              disabled={updateTimeMutation.isPending}
              onClick={() => updateTimeMutation.mutate()}
            >
              <Clock3 className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingLogId)}
        onOpenChange={(open) => !open && setDeletingLogId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the time entry. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingLogId) {
                  deleteTimeMutation.mutate(deletingLogId);
                }
              }}
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EditableSelect({
  icon,
  label,
  value,
  options,
  disabled,
  allowNone = false,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  options: LookupOption[];
  disabled?: boolean;
  allowNone?: boolean;
  onChange: (value: string | null) => void;
}) {
  const selectedOption = options.find((opt) => opt.id === value);
  const selectedColor = selectedOption?.color;

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <span 
          style={selectedColor ? { color: selectedColor } : undefined}
          className={cn("text-muted-foreground shrink-0", selectedColor && "transition-colors")}
        >
          {icon}
        </span>
        <Select
          value={value ?? 'none'}
          disabled={disabled || (!allowNone && options.length === 0)}
          onValueChange={(nextValue) =>
            onChange(nextValue === 'none' ? null : nextValue)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {allowNone ? (
              <SelectItem value="none">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                  <span>Unassigned</span>
                </div>
              </SelectItem>
            ) : null}
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <div className="flex items-center gap-2">
                  {option.color ? (
                    <span
                      className="h-2 w-2 rounded-full border border-black/10 dark:border-white/10 shrink-0"
                      style={{ backgroundColor: option.color }}
                    />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-slate-400 shrink-0" />
                  )}
                  <span>{optionLabel(option)}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Field>
  );
}

function TicketAssignees({
  members,
  assignees,
  disabled,
  onToggle,
}: {
  members: LookupOption[];
  assignees: any[];
  disabled?: boolean;
  onToggle: (member: LookupOption, assignee?: any) => void;
}) {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-sm font-medium">Additional assignees</div>
        <p className="text-muted-foreground text-xs">
          Add multiple agents when this ticket needs shared ownership.
        </p>
      </div>
      <div className="max-h-64 space-y-2 overflow-auto pr-1">
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No workspace members found.
          </p>
        ) : (
          members.map((member) => {
            const assignee = assignees.find(
              (item) => item.account_id === member.id,
            );
            const selected = Boolean(assignee);

            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-xl border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {optionLabel(member)}
                  </div>
                  {member.email ? (
                    <div className="text-muted-foreground truncate text-xs">
                      {member.email}
                    </div>
                  ) : null}
                </div>
                <Button
                  variant={selected ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={disabled}
                  onClick={() => onToggle(member, assignee)}
                >
                  {selected ? 'Remove' : 'Add'}
                </Button>
              </div>
            );
          })
        )}
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

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">
      {label}
    </span>
  );
}

function EmptyState({
  title,
  description,
  compact = false,
}: {
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-dashed bg-slate-50 text-center dark:bg-slate-900/40 ${compact ? 'p-5' : 'p-10'}`}
    >
      <div className="font-medium">{title}</div>
      <p className="text-muted-foreground mt-1 text-sm">{description}</p>
    </div>
  );
}

function ServiceCloudTicketDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* ── Hero banner skeleton ── */}
      <section className="overflow-hidden rounded-none border bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(135deg,_#0f172a,_#164e63_52%,_#0f172a)] p-6 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl space-y-5">
            {/* Back button */}
            <Skeleton className="h-8 w-32 rounded-md bg-white/20" />
            <div className="space-y-3">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-14 rounded-full bg-white/20" />
                <Skeleton className="h-5 w-16 rounded-full bg-white/20" />
                <Skeleton className="h-5 w-14 rounded-full bg-white/20" />
                <Skeleton className="h-5 w-40 rounded-full bg-white/15" />
              </div>
              {/* Title + description */}
              <div className="space-y-2">
                <Skeleton className="h-9 w-3/4 bg-white/20" />
                <Skeleton className="h-4 w-full bg-white/15" />
                <Skeleton className="h-4 w-5/6 bg-white/15" />
              </div>
            </div>
          </div>
          {/* Metrics panel */}
          <div className="grid gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur md:min-w-[360px]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <Skeleton className="h-4 w-24 bg-white/20" />
                <Skeleton className="h-4 w-20 bg-white/20" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Body grid skeleton ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
        {/* Left — Ticket Workspace */}
        <div className="space-y-4">
          <Card>
            {/* Card header */}
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-64" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-8 w-32 rounded-md" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-full" />
                <Skeleton className="h-7 w-16 rounded-full" />
              </div>
            </CardHeader>
            <div className="space-y-5 px-6 py-4">
              {/* Tab bar */}
              <div className="flex w-fit gap-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
                {['Conversation', 'Work', 'Notes & Files', 'Activity'].map(
                  (tab) => (
                    <Skeleton key={tab} className="h-8 w-24 rounded-xl" />
                  ),
                )}
              </div>
              {/* Email cards */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border shadow-sm"
                >
                  {/* Email header */}
                  <div className="border-b bg-slate-50 p-4 dark:bg-slate-900/60">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1.5">
                        <Skeleton className="h-4 w-56" />
                        <Skeleton className="h-3 w-40" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-7 w-16 rounded-md" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                  </div>
                  {/* Email body */}
                  <div className="space-y-2 p-5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-3 w-4/5" />
                    {i === 1 && <Skeleton className="h-3 w-3/4" />}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right — aside cards */}
        <aside className="space-y-4">
          {/* Ticket Properties */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-1 h-3 w-52" />
            </CardHeader>
            <div className="space-y-4 px-6 py-4">
              {/* Select rows */}
              {['Status', 'Priority', 'Category', 'Primary owner'].map(
                (label) => (
                  <div key={label} className="grid gap-2">
                    <Skeleton className="h-3 w-20" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4 rounded" />
                      <Skeleton className="h-9 flex-1 rounded-md" />
                    </div>
                  </div>
                ),
              )}
              {/* Due date */}
              <div className="grid gap-2">
                <Skeleton className="h-3 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-9 flex-1 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-px w-full" />
              {/* Assignees section */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-3 w-36" />
                    </div>
                    <Skeleton className="h-8 w-14 rounded-md" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* SLA Snapshot */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <div className="space-y-3 px-6 py-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </Card>

          {/* Customer Context */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-36" />
            </CardHeader>
            <div className="space-y-3 px-6 py-4">
              {['Name', 'Email', 'Phone'].map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between gap-4"
                >
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
              <Skeleton className="h-px w-full" />
              {['Company', 'Industry', 'Website'].map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between gap-4"
                >
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </Card>

          {/* Record Details */}
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <div className="space-y-3 px-6 py-4">
              {[
                'Source',
                'First response',
                'Last customer reply',
                'Updated',
              ].map((field) => (
                <div
                  key={field}
                  className="flex items-center justify-between gap-4"
                >
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
