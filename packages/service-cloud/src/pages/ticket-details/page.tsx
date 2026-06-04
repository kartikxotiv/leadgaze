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
  Tag,
  Timer,
  UserCheck,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { CoreEmailReplyDialog, CoreEntityPanel } from '@kit/core/pages';
import { getCoreEmailAccountsService } from '@kit/core/services';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';

import {
  createServiceCloudResourceService,
  deleteServiceCloudResourceService,
  getServiceCloudTicketDetailService,
  logServiceCloudTicketTimeService,
  updateServiceCloudResourceService,
} from '../../services';

type LookupOption = {
  id: string;
  name?: string | null;
  email?: string | null;
  color?: string | null;
  lifecycle?: string | null;
  severity_order?: number | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString();
}

function formatDateOnly(value?: string | null) {
  if (!value) return '-';
  return value.includes('T') ? value.slice(0, 10) : value;
}

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
  const queryKey = ['service-cloud', 'ticket-detail', workspaceId, ticketId];
  const [timeForm, setTimeForm] = useState({
    hours: '',
    minutes: '',
    description: '',
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
    enabled: Boolean(workspaceId),
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
      });
    },
    onSuccess: async () => {
      toast.success('Time logged');
      setTimeForm({ hours: '', minutes: '', description: '' });
      await queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: any) => toast.error(error.message || 'Failed to log time'),
  });

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

  if (isLoading) {
    return (
      <div className="text-muted-foreground p-6 text-sm">Loading ticket...</div>
    );
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
  const teams = lookups.teams ?? [];
  const members = lookups.members ?? [];
  const assignedAgent = members.find(
    (member: LookupOption) => member.id === ticket.assigned_agent_id,
  );
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
  const dueValue = ticket.due_date ?? ticket.due_at;

  const updateTicket = (payload: Record<string, unknown>) =>
    updateMutation.mutate(payload);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[28px] border bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(135deg,_#0f172a,_#164e63_52%,_#0f172a)] text-white shadow-xl">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
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

            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                  #{ticket.ticket_number}
                </Badge>
                <Badge className="border-emerald-300/30 bg-emerald-400/15 text-emerald-100">
                  {ticket.status?.name ?? 'Open'}
                </Badge>
                {ticket.priority?.name ? (
                  <Badge className="border-white/20 bg-white/15 text-white">
                    {ticket.priority.name}
                  </Badge>
                ) : null}
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/75">
                  Created {formatDateTime(ticket.created_at)}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">
                  {ticket.subject}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
                  {ticket.description ||
                    'No description has been added for this ticket yet.'}
                </p>
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
            <Metric label="Due date" value={formatDateOnly(dueValue)} muted />
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
          <Card className="border-slate-200 shadow-sm dark:border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Inbox className="h-5 w-5 text-cyan-600" />
                    Ticket Workspace
                  </CardTitle>
                  <CardDescription>
                    Customer conversation, internal work, attachments, and
                    service timeline.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  {latestThreadEmail ? (
                    <Button
                      size="sm"
                      onClick={() => setReplyEmail(latestThreadEmail)}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Reply in thread
                    </Button>
                  ) : null}
                  <StatusPill label={ticket.source ?? 'manual'} />
                  <StatusPill label={`${emails.length} emails`} />
                  <StatusPill label={formatDuration(totalLoggedSeconds)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="conversation" className="space-y-5">
                <TabsList className="grid h-auto grid-cols-2 rounded-2xl bg-slate-100 p-1 md:w-fit md:grid-cols-4 dark:bg-slate-900">
                  <TabsTrigger value="conversation">Conversation</TabsTrigger>
                  <TabsTrigger value="work">Work</TabsTrigger>
                  <TabsTrigger value="files">Notes & Files</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="conversation" className="space-y-4">
                  {emails.length === 0 ? (
                    <EmptyState
                      title="No emails linked yet"
                      description="Emails converted into this ticket will appear here."
                    />
                  ) : (
                    emails.map((item: any) => {
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
                    })
                  )}
                </TabsContent>

                <TabsContent value="work" className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Timer className="h-4 w-4" />
                          Log Time
                        </CardTitle>
                        <CardDescription>
                          Track work directly against this ticket.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
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
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Time Entries
                        </CardTitle>
                        <CardDescription>
                          Total logged: {formatDuration(totalLoggedSeconds)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {timeEntries.length === 0 ? (
                          <EmptyState
                            title="No time logged"
                            description="Add time entries as agents work this ticket."
                            compact
                          />
                        ) : (
                          timeEntries.map((entry: any) => (
                            <div
                              key={entry.id}
                              className="rounded-xl border p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold">
                                  {formatDuration(entry.duration_seconds)}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                  {entry.logged_date}
                                </span>
                              </div>
                              {entry.description ? (
                                <p className="text-muted-foreground mt-2 text-sm">
                                  {entry.description}
                                </p>
                              ) : null}
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="files">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Paperclip className="h-4 w-4" />
                        Notes & Attachments
                      </CardTitle>
                      <CardDescription>
                        Core notes and documents attached to this ticket.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CoreEntityPanel
                        workspaceId={workspaceId}
                        entityType="service_cloud_ticket"
                        entityId={ticketId}
                        capabilities={['notes', 'documents']}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Ticket Activity
                      </CardTitle>
                      <CardDescription>
                        Status, priority, assignment, email, and time-log
                        history for this ticket.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
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
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Ticket Properties</CardTitle>
              <CardDescription>
                Operational fields agents update while working the case.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
              <EditableSelect
                icon={<UsersRound className="h-4 w-4" />}
                label="Team"
                value={ticket.assigned_team_id}
                options={teams}
                disabled={isUpdating}
                allowNone
                onChange={(value) => updateTicket({ assigned_team_id: value })}
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
            </CardContent>
          </Card>

          <Card className={priorityTone(ticket.priority)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">SLA Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Metric
                label="Priority"
                value={ticket.priority?.name ?? 'Not set'}
              />
              <Metric
                label="Response due"
                value={formatDateTime(ticket.response_due_at)}
              />
              <Metric label="Resolution due" value={formatDateOnly(dueValue)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-4 w-4" />
                Customer Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                Record Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
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
            </CardContent>
          </Card>
        </aside>
      </div>

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
      />
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
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <Select
          value={value ?? 'none'}
          disabled={disabled || (!allowNone && options.length === 0)}
          onValueChange={(nextValue) =>
            onChange(nextValue === 'none' ? null : nextValue)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {allowNone ? (
              <SelectItem value="none">Unassigned</SelectItem>
            ) : null}
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {optionLabel(option)}
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
    <div className="space-y-3">
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
