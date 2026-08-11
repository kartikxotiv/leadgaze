'use client';

import { useState } from 'react';
import React from 'react';

import Link from 'next/link';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  Building2,
  Globe,
  Factory,
  Phone,
  CalendarDays,
  Clock,
  Clock3,
  FileText,
  Flag,
  Inbox,
  Mail,
  Paperclip,
  Pencil,
  Settings,
  Tag,
  Timer,
  Trash2,
  UserCheck,
  UserRound,
  Edit2,
  Plus,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { DateTimePicker } from '@kit/ui/datetime-picker';
import { format } from 'date-fns';
import {
  CoreEmailComposeDialog,
  CoreEmailReplyDialog,
  CoreEntityPanel,
} from '@kit/core/pages';
import { getCoreEmailAccountsService } from '@kit/core/services';
import { useLocalization } from '@kit/shared/localization';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@kit/ui/accordion';
import { DetailHeader } from '@kit/ui/detail-header';
import { DetailInfoList, DetailInfoRow } from '@kit/ui/detail-info-row';
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
import { Calendar } from '@kit/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import CustomTableContainer from '@kit/ui/custom-table-container';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { PageBody } from '@kit/ui/page';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@kit/ui/tooltip';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { cn } from '@kit/ui/utils';

import {
  createServiceCloudResourceService,
  deleteServiceCloudResourceService,
  getServiceCloudTicketDetailService,
  logServiceCloudTicketTimeService,
  updateServiceCloudResourceService,
} from '../../services';
import { LeadCustomFieldInputs } from '~/components/leads/lead-custom-field-inputs';
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

/** Returns a YYYY-MM-DD string using the Date's *local* components (timezone-safe). */
function toLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Returns today as a YYYY-MM-DD string using local time. */
function todayLocalDate() {
  return toLocalDateString(new Date());
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

function TicketCustomFieldsSection({
  fields,
  ticket,
  canEditField,
  canViewField,
  onSave,
  isSaving,
}: {
  fields: any[];
  ticket: any;
  canEditField?: (fieldKey: string) => boolean;
  canViewField?: (fieldKey: string) => boolean;
  onSave: (val: Record<string, unknown>) => void;
  isSaving?: boolean;
}) {
  const initialValues = React.useMemo(() => {
    return (ticket.custom_fields as Record<string, unknown>) || {};
  }, [ticket.custom_fields]);

  const [values, setValues] = useState<Record<string, unknown>>(initialValues);

  // Sync state if ticket custom_fields values changes externally
  React.useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const isChanged = React.useMemo(() => {
    return JSON.stringify(values) !== JSON.stringify(initialValues);
  }, [values, initialValues]);

  return (
    <AccordionItem
      value="custom-fields"
      className="overflow-hidden border bg-white dark:bg-zinc-900"
    >
      <AccordionTrigger className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-3">
        <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">

          <Settings className="text-leadgaze-dark h-5 w-5 dark:text-white" />
          Additional Data
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-2 pb-2">
        
          <LeadCustomFieldInputs
            fields={fields}
            values={values}
            onChange={(key, value) => {
              setValues((prev) => ({
                ...prev,
                [key]: value,
              }));
            }}
            canEdit={canEditField || (() => true)}
            canView={canViewField || (() => true)}
          />

          {isChanged && (
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                disabled={isSaving}
                onClick={() => onSave(values)}
              >
                Save Changes
              </Button>
            </div>
          )}        
      </AccordionContent>
    </AccordionItem>
  );
}

function eventLabel(eventType?: string | null) {
  return String(eventType || 'activity')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function ServiceCloudTicketDetailPage({
  workspaceId,
  ticketId,
  canViewField,
  canEditField,
  customFieldsList,
}: {
  workspaceId: string;
  ticketId: string;
  /** Optional FLS: fields returning false are hidden from the detail view. */
  canViewField?: (fieldKey: string) => boolean;
  /** Optional FLS: fields returning false are shown as read-only in the sidebar. */
  canEditField?: (fieldKey: string) => boolean;
  customFieldsList?: any[];
}) {
  const { formatDate, formatDateOnly, formatDateTime } = useLocalization();
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
    logged_date: todayLocalDate(),
  });
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    hours: '',
    minutes: '',
    description: '',
    activities: '',
    logged_date: todayLocalDate(),
  });
  const [replyEmail, setReplyEmail] = useState<any | null>(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<string[]>([
    'ticket-properties',
    'sla-snapshot',
  ]);

  const { getHeaderProps, getResizeHandleProps } = useColumnResize(
    'sc-ticket-details-time-entries',
  );

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
        logged_date: timeForm.logged_date,
      });
    },
    onSuccess: async () => {
      toast.success('Time logged');
      setTimeForm({
        hours: '',
        minutes: '',
        description: '',
        activities: '',
        logged_date: todayLocalDate(),
      });
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
        logged_date: editForm.logged_date,
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
      logged_date: entry.logged_date
        ? entry.logged_date.slice(0, 10)
        : todayLocalDate(),
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
  const allStatuses = lookups.statuses ?? [];
  const allPriorities = lookups.priorities ?? [];

  // Filter out private statuses/priorities that the current user cannot access
  const statuses = allStatuses.filter((s: any) => {
    if (s.access_type === 'public') return true;
    if (s.access_type === 'private') return false;
    return true;
  });

  const priorities = allPriorities.filter((p: any) => {
    if (p.access_type === 'public') return true;
    if (p.access_type === 'private') return false;
    return true;
  });

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
    <>
      {/* Top Header */}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-between">
        <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    asChild
                    className="w-6 h-6 border-leadgaze-border border p-0"
                  >
                    <Link href="/home/services/tickets">
                      <ArrowLeft className="h-3 w-3" />
                    </Link>
                  </Button>
                  <h1 className="primary-heading-extra text-leadgaze-dark dark:text-white">
                    Ticket Detail
                  </h1>
        </div>        
        
        <div className="flex items-center gap-2">
          <Button variant="outline" className="secondary-text-small-bold text-leadgaze-dark dark:text-white gap-1.5 px-2">
            <span className="font-medium text-gray-700 dark:text-white">Logged:</span>
            <span className="text-gray-500 dark:text-white">{formatDuration(totalLoggedSeconds)}</span>
          </Button>
          <Button variant="default" className="secondary-text-small-bold bg-leadgaze-primary hover:bg-leadgaze-primary text-white gap-1.5 px-2">
            <Edit2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Add Time</span>
          </Button>          
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="w-full space-y-4 lg:w-[65%] lg:overflow-y-auto">
          {/* Left Column Header Info */}
          <DetailHeader
            title={ticket.subject}
            subtitle={
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-white">
                  <span>
                    Created by <span className="font-bold">{ticket.created_by_account?.name || 'Unknown'}</span> on {formatDate(ticket.created_at)} | {ticket.created_at && new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>                
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 dark:text-white">
                  <span>
                    Assigned to <span className="font-bold">{assignedAgent?.name || 'Unassigned'}</span> on {ticket.updated_at ? formatDate(ticket.updated_at) : formatDate(ticket.created_at)} | {ticket.updated_at ? new Date(ticket.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : new Date(ticket.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            }
            right={
              <div className="mx-auto flex flex-col items-center gap-1 lg:mx-0">
                <span className="text-[10px] font-medium text-leadgaze-dark dark:text-white uppercase tracking-wider">
                  SLA
                </span>
                <div className="flex items-center justify-center rounded-full border-2 border-red-500 bg-white h-[42px] w-[42px]">
                  <span className="text-[11px] sm:text-xs font-bold text-gray-900 text-center leading-tight">
                    {ticket.priority?.resolution_due_minutes
                      ? (() => {
                          const mins = ticket.priority.resolution_due_minutes;
                          const h = Math.floor(mins / 60);
                          const m = mins % 60;
                          if (h > 0 && m > 0) return `${h}h\n${m}m`;
                          if (h > 0) return `${h}h`;
                          return `${m}m`;
                        })()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            }
          />
          
          
            <Tabs
              defaultValue={canManageInbox ? 'conversation' : 'work'}
              className="space-y-4 mb-2"
            >
              <TabsList className="mb-0 h-auto w-full justify-start gap-3 overflow-x-auto rounded-none border-b bg-transparent p-0 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden">
                {canManageInbox ? (
                  <TabsTrigger
                    value="conversation"
                    className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Conversation
                  </TabsTrigger>
                ) : null}
                <TabsTrigger
                  value="work"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Clock3 className="mr-2 h-4 w-4" />
                  Time loged
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Notes
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Document
                </TabsTrigger>
                <TabsTrigger
                  value="activity"
                  className="data-[state=active]:border-primary shrink-0 rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:bg-transparent"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Activity
                </TabsTrigger>
              </TabsList>

              {canManageInbox ? (
                <TabsContent value="conversation" className="max-h-[500px] overflow-y-auto mb-2">
                  <CardWidgetContainer
                    title="Conversation"
                    headerClassName="p-2 xl:p-2 2xl:p-2"
                    icon={<Mail className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
                    icon2={
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-2 text-sm text-blue-500 hover:text-blue-600"
                        onClick={() => setIsComposeOpen(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Send Mail
                      </Button>
                    }
                  >
                    <div className="px-2">
                      {emails.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-center flex-col">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
                            <Mail className="mx-auto mb-2 h-6 w-6 text-blue-500 pt-1" />
                            </div>                          
                          <p className="text-sm text-gray-500 mt-4">No Conversation activity yet</p>
                        </div>
                      ) : (
                        <div className="scrollbar-thin h-[calc(100vh-420px)] min-h-[350px] space-y-2 overflow-y-auto pr-2">
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
                    </div>
                  </CardWidgetContainer>
                </TabsContent>
                ) : null}

                <TabsContent value="work" className="max-h-[500px] overflow-y-auto">
                  <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                    <CardWidgetContainer
                      title="Log Time"
                      headerClassName="p-2 xl:p-2 2xl:p-2"
                      icon={<Timer className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
                    >
                      <div className="space-y-2 px-6 pb-4">
                        <Field label="Date">
                          <DateTimePicker
                            mode="date"
                            placeholder="Pick a date"
                            value={
                              timeForm.logged_date
                                ? new Date(
                                  timeForm.logged_date + 'T00:00:00',
                                )
                                : undefined
                            }
                            onChange={(date) =>
                              setTimeForm((prev) => ({
                                ...prev,
                                logged_date: date
                                  ? toLocalDateString(date)
                                  : prev.logged_date,
                              }))
                            }
                          />
                        </Field>
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
                      headerClassName="p-2 xl:p-2 2xl:p-2"
                      icon={<Timer className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
                      icon2={
                        <span className="text-sm font-medium text-gray-500 mr-2">
                          Total logged: {formatDuration(totalLoggedSeconds)}
                        </span>
                      }
                    >
                      <div className="space-y-3 px-6 pb-4">
                        {timeEntries.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
                              <Timer className="h-6 w-6 text-blue-500" />
                            </div>
                            <p className="mt-4 text-sm text-gray-500">No time logged</p>
                          </div>
                        ) : (
                          <PageBody className="sticky flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
                            <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 gap-0">
                              <CustomTableContainer>
                                <div className="scrollbar-thin max-h-[295px] overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead
                                          className="relative w-[80px]"
                                          {...getHeaderProps('s_no')}
                                        >
                                          S. No.
                                          <span
                                            className="col-resize-handle"
                                            {...getResizeHandleProps('s_no')}
                                          />
                                        </TableHead>
                                        <TableHead
                                          className="relative max-w-[150px]"
                                          {...getHeaderProps('activities')}
                                        >
                                          Activities
                                          <span
                                            className="col-resize-handle"
                                            {...getResizeHandleProps(
                                              'activities',
                                            )}
                                          />
                                        </TableHead>
                                        <TableHead
                                          className="relative max-w-[200px]"
                                          {...getHeaderProps('description')}
                                        >
                                          Description
                                          <span
                                            className="col-resize-handle"
                                            {...getResizeHandleProps(
                                              'description',
                                            )}
                                          />
                                        </TableHead>
                                        <TableHead
                                          className="relative w-[150px]"
                                          {...getHeaderProps('author')}
                                        >
                                          Author
                                          <span
                                            className="col-resize-handle"
                                            {...getResizeHandleProps('author')}
                                          />
                                        </TableHead>
                                        <TableHead
                                          className="relative w-[180px]"
                                          {...getHeaderProps('date_time')}
                                        >
                                          Date &amp; Time Log
                                          <span
                                            className="col-resize-handle"
                                            {...getResizeHandleProps(
                                              'date_time',
                                            )}
                                          />
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

                <TabsContent value="notes" className="max-h-[500px] overflow-y-auto">
                  <CardWidgetContainer
                    title="Notes"
                    headerClassName="p-2 xl:p-2 2xl:p-2"
                    icon={<FileText className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
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

                <TabsContent value="documents" className="max-h-[500px] overflow-y-auto">
                  <CardWidgetContainer
                    title="Documents"
                    headerClassName="p-2 xl:p-2 2xl:p-2"
                    icon={<Download className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
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

                <TabsContent value="activity" className="max-h-[500px] overflow-y-auto">
                  <CardWidgetContainer
                    title="Ticket Activity"
                    headerClassName="p-2 xl:p-2 2xl:p-2"
                    icon={<Clock className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
                  >
                    <div className="scrollbar-thin max-h-[400px] min-h-[300px] space-y-3 overflow-y-auto px-6 pb-4 pr-2">
                      {(data.activities ?? []).length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
                            <Clock className="h-6 w-6 text-blue-500" />
                          </div>
                          <p className="mt-4 text-sm text-gray-500">No activity yet</p>
                        </div>
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

        <div className="w-full space-y-4 lg:w-[35%] lg:overflow-y-auto">
          <Accordion
            type="multiple"
            className="space-y-2"
            value={openAccordions}
            onValueChange={setOpenAccordions}
          >
            <AccordionItem
              value="ticket-properties"
              className="overflow-hidden border bg-white dark:bg-zinc-900"
            >
              <AccordionTrigger className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-3">
                <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">
                  <Settings className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                  Ticket Properties
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2">
                <DetailInfoList>
                  {(!canViewField || canViewField('status_id')) && (
                    <EditableSelect
                      icon={<Flag className="h-5 w-5" />}
                      label="Status"
                      value={ticket.status_id}
                      options={statuses}
                      allOptions={allStatuses}
                      disabled={
                        isUpdating ||
                        (canEditField ? !canEditField('status_id') : false)
                      }
                      onChange={(value) => updateTicket({ status_id: value })}
                    />
                  )}
                  {(!canViewField || canViewField('priority_id')) && (
                    <EditableSelect
                      icon={<Flag className="h-5 w-5" />}
                      label="Priority"
                      value={ticket.priority_id}
                      options={priorities}
                      allOptions={allPriorities}
                      disabled={
                        isUpdating ||
                        (canEditField ? !canEditField('priority_id') : false)
                      }
                      allowNone
                      onChange={(value) => updateTicket({ priority_id: value })}
                    />
                  )}
                  {(!canViewField || canViewField('category_id')) && (
                    <EditableSelect
                      icon={<Tag className="h-5 w-5" />}
                      label="Category"
                      value={ticket.category_id}
                      options={categories}
                      disabled={
                        isUpdating ||
                        (canEditField ? !canEditField('category_id') : false)
                      }
                      allowNone
                      onChange={(value) => updateTicket({ category_id: value })}
                    />
                  )}
                  {(!canViewField || canViewField('assigned_agent_id')) && (
                    <EditableSelect
                      icon={<UserCheck className="h-5 w-5" />}
                      label="Primary owner"
                      value={ticket.assigned_agent_id}
                      options={members}
                      disabled={
                        isUpdating ||
                        (canEditField ? !canEditField('assigned_agent_id') : false)
                      }
                      allowNone
                      onChange={(value) =>
                        updateTicket({ assigned_agent_id: value })
                      }
                    />
                  )}
                  {(!canViewField || canViewField('due_at')) && (
                    <div className="flex items-center justify-between gap-2 h-[35px]">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="text-muted-foreground h-5 w-5 shrink-0" />
                        <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
                          Due date
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <EditableDate
                          value={dueValue ? new Date(dueValue) : undefined}
                          disabled={
                            isUpdating ||
                            (canEditField ? !canEditField('due_at') : false)
                          }
                          onChange={(date) =>
                            updateTicket({
                              due_date: date ? format(date, 'yyyy-MM-dd') : null,
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                </DetailInfoList>
                {(!canViewField || canViewField('assignees')) && (
                  <div className="pt-0">
                    <Separator className="mb-2" />
                    <TicketAssignees
                      members={members}
                      assignees={assignees}
                      disabled={
                        assigneeMutation.isPending ||
                        (canEditField ? !canEditField('assignees') : false)
                      }
                      onToggle={(member, assignee) =>
                        assigneeMutation.mutate({
                          accountId: member.id,
                          assigneeId: assignee?.id,
                          action: assignee ? 'remove' : 'add',
                        })
                      }
                    />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="sla-snapshot"
              className="overflow-hidden border bg-white dark:bg-zinc-900"
            >
              <AccordionTrigger className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-3">
                <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">
                  <Timer className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                  SLA Snapshot
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2">
                <DetailInfoList>
                  {(!canViewField || canViewField('priority_id')) && (
                    <div className="flex items-center justify-between gap-2 h-[35px]">
                      <div className="flex items-center gap-2">
                        <Flag className="text-muted-foreground h-5 w-5 shrink-0" />
                        <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Priority</span>
                      </div>
                      <div className="min-w-0 flex-1 text-right">
                        <span className="primary-text-regular text-leadgaze-dark dark:text-white">{ticket.priority?.name ?? 'Not set'}</span>
                      </div>
                    </div>
                  )}
                  {(!canViewField || canViewField('due_at')) && (
                    <>
                      <div className="flex items-center justify-between gap-2 h-[35px]">
                        <div className="flex items-center gap-2">
                          <Timer className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Response due</span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <span className="primary-text-regular text-leadgaze-dark dark:text-white">{responseDueAt ? formatDateTime(responseDueAt) : '-'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 h-[35px] border-b border-b-accordion">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Resolution due</span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <span className="primary-text-regular text-leadgaze-dark dark:text-white">{dueValue ? formatDateOnly(dueValue) : '-'}</span>
                        </div>
                      </div>
                    </>
                  )}
                </DetailInfoList>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="customer-details"
              className="overflow-hidden border bg-white dark:bg-zinc-900"
            >
              <AccordionTrigger className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-3">
                <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">
                  <UserRound className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                  Customer Details
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2">
                <DetailInfoList>
                  {(!canViewField || canViewField('customer')) && (
                    <>
                      <div className="flex items-center justify-between gap-2 h-[35px]">
                        <div className="flex items-center gap-2">
                          <UserRound className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Name</span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <span className="primary-text-regular text-leadgaze-dark dark:text-white">{ticket.customer?.name ?? '-'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 h-[35px]">
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Email</span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate block">{ticket.customer?.email ?? '-'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 h-[35px]">
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Phone</span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <span className="primary-text-regular text-leadgaze-dark dark:text-white">{ticket.customer?.phone ?? '-'}</span>
                        </div>
                      </div>
                    </>
                  )}
                  {(!canViewField || canViewField('organization')) && (
                    <>
                      <div className="flex items-center justify-between gap-2 h-[35px]">
                        <div className="flex items-center gap-2">
                          <Building2 className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Company</span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <span className="primary-text-regular text-leadgaze-dark dark:text-white">{ticket.organization?.name ?? '-'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 h-[35px]">
                        <div className="flex items-center gap-2">
                          <Factory className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Industry</span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <span className="primary-text-regular text-leadgaze-dark dark:text-white">{ticket.organization?.industry ?? '-'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 h-[35px] border-b border-b-accordion">
                        <div className="flex items-center gap-2">
                          <Globe className="text-muted-foreground h-5 w-5 shrink-0" />
                          <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Website</span>
                        </div>
                        <div className="min-w-0 flex-1 text-right">
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium truncate block">{ticket.organization?.website ?? '-'}</span>
                        </div>
                      </div>
                    </>
                  )}
                </DetailInfoList>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="record-details"
              className="overflow-hidden border bg-white dark:bg-zinc-900"
            >
              <AccordionTrigger className="px-2 pb-2 border-b border-b-accordion hover:no-underline py-3">
                <span className="primary-text-big-regular text-leadgaze-dark flex items-center gap-2 dark:text-white">
                  <Building2 className="text-leadgaze-dark h-5 w-5 dark:text-white" />
                  Record Details
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2">
                <DetailInfoList>
                  <div className="flex items-center justify-between gap-2 h-[35px]">
                    <div className="flex items-center gap-2">
                      <Inbox className="text-muted-foreground h-5 w-5 shrink-0" />
                      <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Source</span>
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <span className="primary-text-regular text-leadgaze-dark dark:text-white">{ticket.source ?? '-'}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 h-[35px]">
                    <div className="flex items-center gap-2">
                      <Clock3 className="text-muted-foreground h-5 w-5 shrink-0" />
                      <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Last response</span>
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <span className="primary-text-regular text-leadgaze-dark dark:text-white">
                        {ticket.last_agent_response_at
                          ? formatDateTime(ticket.last_agent_response_at)
                          : 'No response yet'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 h-[35px]">
                    <div className="flex items-center gap-2">
                      <Clock className="text-muted-foreground h-5 w-5 shrink-0" />
                      <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Last reply</span>
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <span className="primary-text-regular text-leadgaze-dark dark:text-white">
                        {ticket.last_customer_response_at
                          ? formatDateTime(ticket.last_customer_response_at)
                          : 'Customer has not responded yet'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 h-[35px] border-b border-b-accordion">
                    <div className="flex items-center gap-2">
                      <Timer className="text-muted-foreground h-5 w-5 shrink-0" />
                      <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">Updated</span>
                    </div>
                    <div className="min-w-0 flex-1 text-right">
                      <span className="primary-text-regular text-leadgaze-dark dark:text-white">{formatDateTime(ticket.updated_at)}</span>
                    </div>
                  </div>
                </DetailInfoList>
              </AccordionContent>
            </AccordionItem>

            {customFieldsList && customFieldsList.length > 0 && (
              <TicketCustomFieldsSection
                fields={customFieldsList}
                ticket={ticket}
                canEditField={canEditField}
                canViewField={canViewField}
                onSave={(updatedFields) => {
                  updateTicket({
                    custom_fields: updatedFields,
                  });
                }}
                isSaving={isUpdating}
              />
            )}
          </Accordion>
        </div>
      </div>

      {canManageInbox ? (
        <>
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
          <CoreEmailComposeDialog
            open={isComposeOpen}
            onOpenChange={(open) => {
              setIsComposeOpen(open);
              if (!open) {
                void queryClient.invalidateQueries({ queryKey });
              }
            }}
            workspaceId={workspaceId}
            accounts={emailAccounts}
            initialTo={ticket.customer?.email ?? ''}
            entityType="service_cloud_ticket"
            entityId={ticketId}
            templateContext={ticketTemplateContext}
          />
        </>
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
          <div className="space-y-2">
            <Field label="Date">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !editForm.logged_date && 'text-muted-foreground',
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {editForm.logged_date
                      ? formatDateOnly(editForm.logged_date)
                      : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={
                      editForm.logged_date
                        ? new Date(editForm.logged_date + 'T00:00:00')
                        : undefined
                    }
                    onSelect={(date) =>
                      setEditForm((prev) => ({
                        ...prev,
                        logged_date: date
                          ? toLocalDateString(date)
                          : prev.logged_date,
                      }))
                    }
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>
            </Field>
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
    </>
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
  allOptions,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
  options: LookupOption[];
  disabled?: boolean;
  allowNone?: boolean;
  onChange: (value: string | null) => void;
  allOptions?: LookupOption[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const allOptsForLookup = allOptions || options;
  const selectedOption = allOptsForLookup.find((opt) => opt.id === value);

  return (
    <div className="flex items-center justify-between gap-2 h-[35px]">
      <div className="flex items-center gap-2">
        <span
          style={selectedOption?.color ? { color: selectedOption.color } : undefined}
          className={cn(
            'text-muted-foreground shrink-0 flex h-5 w-5 items-center justify-center',
            selectedOption?.color && 'transition-colors',
          )}
        >
          {icon}
        </span>
        <span className="primary-text-medium text-leadgaze-dark w-26 shrink-0 dark:text-white">
          {label}
        </span>
      </div>

      <div className="min-w-0 flex-1 text-right">
        {isEditing ? (
          <Select
            value={value ?? 'none'}
            onValueChange={(nextValue) => {
              onChange(nextValue === 'none' ? null : nextValue);
              setIsEditing(false);
            }}
            open={isEditing}
            onOpenChange={(open) => {
              if (!open) setIsEditing(false);
            }}
            disabled={disabled || (!allowNone && options.length === 0)}
          >
            <SelectTrigger className="ml-auto w-[220px] justify-end text-right">
              <div className="flex items-center gap-2 justify-end">
                {selectedOption?.color ? (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10 dark:border-white/10"
                    style={{ backgroundColor: selectedOption.color }}
                  />
                ) : null}
                <span className="truncate">
                  {selectedOption
                    ? optionLabel(selectedOption)
                    : `Select ${label.toLowerCase()}`}
                </span>
              </div>
            </SelectTrigger>
            <SelectContent align="end">
              {allowNone ? (
                <SelectItem value="none">
                  <span>Unassigned</span>
                </SelectItem>
              ) : null}
              {options.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <div className="flex items-center gap-2">
                    {option.color ? (
                      <span
                        className="h-2 w-2 shrink-0 rounded-full border border-black/10 dark:border-white/10"
                        style={{ backgroundColor: option.color }}
                      />
                    ) : null}
                    <span>{optionLabel(option)}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setIsEditing(true)}
            className={cn(
              'group inline-flex w-full min-h-[34px] py-1 px-2 items-center justify-end rounded-[4px] text-right outline-none transition-colors',
              {
                'cursor-text': !disabled,
                'text-muted-foreground': !value,
                'hover:bg-accent/20': !disabled,
              },
            )}
          >
            <div className="flex w-full items-center justify-end gap-2 text-right">
              {selectedOption ? (
                selectedOption.color ? (
                  <Badge
                    className="font-medium shadow-none px-2 py-0.5 border-transparent hover:opacity-90"
                    style={{
                      backgroundColor: selectedOption.color,
                      color: '#ffffff',
                    }}
                  >
                    {optionLabel(selectedOption)}
                  </Badge>
                ) : (
                  <span className="block truncate text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
                    {optionLabel(selectedOption)}
                  </span>
                )
              ) : (
                <span className="block truncate text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
                  -
                </span>
              )}
            </div>
          </button>
        )}
      </div>
    </div>
  );
}

function EditableDate({
  value,
  disabled,
  onChange,
}: {
  value: Date | undefined;
  disabled?: boolean;
  onChange: (date: Date | undefined) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="flex w-full items-center justify-end">
      {isEditing ? (
        <Popover open={isEditing} onOpenChange={setIsEditing}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[220px] justify-start text-left font-normal"
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              {value ? format(value, 'PP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={value}
              onSelect={(date) => {
                onChange(date);
                setIsEditing(false);
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsEditing(true)}
          className={cn(
            'group inline-flex w-full min-h-[34px] py-1 px-2 items-center justify-end rounded-[4px] text-right outline-none transition-colors',
            {
              'cursor-text': !disabled,
              'text-muted-foreground': !value,
              'hover:bg-accent/20': !disabled,
            },
          )}
        >
          <span className="block truncate text-sm text-gray-900 dark:text-white transition-colors group-hover:text-foreground">
            {value ? format(value, 'PP') : '-'}
          </span>
        </button>
      )}
    </div>
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
        <div className="primary-text-medium text-leadgaze-dark dark:text-white">Additional assignees</div>
        <p className="text-muted-foreground text-xs pt-1">
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
                className="flex items-center justify-between gap-2 border p-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-leadgaze-dark dark:text-white">
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
                  disabled={disabled}
                  onClick={() => onToggle(member, assignee)}
                  className="secondary-text-small-bold text-leadgaze-dark dark:text-white gap-1.5 px-2"
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
    <span className="mt-1 rounded-full border bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200">
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
    <div className="flex flex-1 flex-col min-h-0 px-2 gap-2">
      {/* Top Header */}
      <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:justify-between mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 border-leadgaze-border border" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      <div className="flex w-full flex-col gap-2 lg:min-h-0 lg:flex-1 lg:flex-row">
        <div className="w-full space-y-4 lg:w-[65%] lg:overflow-y-auto">
          {/* DetailHeader Skeleton */}
          <div className="border border-gray-200 bg-white p-5 shadow-sm">
             <div className="flex flex-col gap-2">
               <Skeleton className="h-6 w-1/3" />
               <Skeleton className="h-4 w-1/4" />
               <Skeleton className="h-4 w-1/4" />
             </div>
          </div>

          <div className="w-full">
            {/* Tabs List */}
            <div className="mb-4 flex gap-6 border-b border-gray-200 pb-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-24" />
            </div>

            {/* Content Card Skeleton */}
            <div className="border border-gray-200 bg-white">
              <div className="flex items-center justify-between border-b border-gray-200 p-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right side accordions */}
        <div className="w-full space-y-4 lg:w-[35%] lg:overflow-y-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-gray-200 bg-white p-4">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
