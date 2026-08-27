'use client';

import { useState, useMemo } from 'react';
import React from 'react';

import Link from 'next/link';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
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
  LayoutGrid,
  Timer,
  Trash2,
  UserCheck,
  UserRound,
  Edit2,
  Plus,
  Download,
  CloudUpload,
  UserPlus,
  RefreshCw,
  Check,
  RotateCcw,
  Loader2,
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
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useLocalization } from '@kit/shared/localization';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@kit/ui/accordion';
import { DetailHeader } from '@kit/ui/detail-header';
import { DetailInfoList, DetailInfoRow } from '@kit/ui/detail-info-row';
import { CustomTimeLog, type TimeLogValue } from '@kit/ui/custom-time-log';
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
import { ColumnHeader } from '@kit/ui/column-header';
import { TablePagination } from '@kit/ui/table-pagination';
import { useTableSort } from '@kit/ui/use-table-sort';
import { Checkbox } from '@kit/ui/checkbox';
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
  DialogFooter,
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
import {
  getNotesService,
  createNoteService,
  updateNoteService,
  deleteNoteService,
  getDocumentsService,
  uploadDocumentService,
  deleteDocumentService,
} from '@kit/core/services';
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

function getActionBadge(action: string, color: string) {
  switch (color) {
    case 'emerald':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
          {action}
        </span>
      );
    case 'blue':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
          {action}
        </span>
      );
    case 'rose':
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
          {action}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-gray-100 text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300">
          {action}
        </span>
      );
  }
}

function getActivityUIDetails(activity: any) {
  switch (activity.event_type) {
    case 'created':
      return { icon: <Activity className="h-3.5 w-3.5 text-gray-500" />, module: 'Ticket', action: 'CREATED', color: 'emerald' };
    case 'status_changed':
      return { icon: <Activity className="h-3.5 w-3.5 text-blue-500" />, module: 'Status', action: 'UPDATED', color: 'blue' };
    case 'priority_changed':
      return { icon: <Flag className="h-3.5 w-3.5 text-orange-500" />, module: 'Priority', action: 'UPDATED', color: 'blue' };
    case 'assigned':
      return { icon: <UserPlus className="h-3.5 w-3.5 text-indigo-500" />, module: 'Assignment', action: 'UPDATED', color: 'blue' };
    case 'email_sent':
      return { icon: <Mail className="h-3.5 w-3.5 text-blue-500" />, module: 'Conversation', action: 'SENT', color: 'blue' };
    case 'email_received':
      return { icon: <Mail className="h-3.5 w-3.5 text-purple-500" />, module: 'Conversation', action: 'RECEIVED', color: 'blue' };
    case 'time_logged':
      return { icon: <Clock3 className="h-3.5 w-3.5 text-sky-500" />, module: 'Time Log', action: 'CREATED', color: 'emerald' };
    case 'note_added':
      return { icon: <FileText className="h-3.5 w-3.5 text-purple-500" />, module: 'Note', action: 'CREATED', color: 'emerald' };
    case 'document_uploaded':
      return { icon: <FileText className="h-3.5 w-3.5 text-gray-500" />, module: 'Document', action: 'UPLOADED', color: 'emerald' };
    case 'deleted':
      return { icon: <Trash2 className="h-3.5 w-3.5 text-red-500" />, module: 'Ticket', action: 'DELETED', color: 'rose' };
    default:
      return { icon: <Clock className="h-3.5 w-3.5 text-gray-400" />, module: 'Activity', action: String(activity.event_type || 'UPDATE').toUpperCase(), color: 'gray' };
  }
}

function eventLabel(eventType?: string | null) {
  return String(eventType || 'activity')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatFileSize(size?: number) {
  if (!size) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
  const supabase = useSupabase();
  const { formatDate, formatDateOnly, formatDateTime } = useLocalization();

  const handleDownloadAttachment = async (e: React.MouseEvent, attachment: any) => {
    e.stopPropagation();
    try {
      const path = attachment.path || attachment.url;
      if (!path) return;

      if (path.startsWith('http://') || path.startsWith('https://')) {
        window.open(path, '_blank');
        return;
      }

      const { data, error } = await supabase.storage
        .from('email_attachments')
        .createSignedUrl(path, 300);

      if (error || !data?.signedUrl) {
        toast.error('Failed to download attachment');
        return;
      }

      const a = document.createElement('a');
      a.href = data.signedUrl;
      a.download = attachment.name || attachment.fileName || 'attachment';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download attachment');
    }
  };
  const queryClient = useQueryClient();
  const { canAccess, isLoading: permissionsLoading } =
    useServiceCloudPermissions(workspaceId);
  const canManageInbox = canAccess(
    SERVICE_CLOUD_MODULE_KEYS.inboxes,
    SERVICE_CLOUD_FEATURE_KEYS.manageInbox,
  );
  const queryKey = ['service-cloud', 'ticket-detail', workspaceId, ticketId];

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
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed'>('active');
  const [openAccordions, setOpenAccordions] = useState<string[]>([
    'ticket-properties',
    'sla-snapshot',
  ]);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [noteContent, setNoteContent] = useState('');
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const [isTimeLogOpen, setIsTimeLogOpen] = useState(false);

  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [documentForm, setDocumentForm] = useState({ name: '', file: null as File | null, file_url: '', category: '', description: '' });
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  const { getHeaderProps, getResizeHandleProps } = useColumnResize(
    'sc-ticket-details-time-entries',
  );

  const { data, isLoading, refetch: refetchTicketDetail, isFetching: isFetchingTicketDetail } = useQuery({
    queryKey,
    queryFn: () => getServiceCloudTicketDetailService(workspaceId, ticketId),
    enabled: Boolean(workspaceId && ticketId),
  });

  const { data: emailAccounts = [] } = useQuery({
    queryKey: ['core-email-accounts', workspaceId],
    queryFn: () => getCoreEmailAccountsService(workspaceId),
    enabled: Boolean(workspaceId && canManageInbox),
  });

  const rawTimeEntries = data?.timeEntries ?? [];
  const [timePage, setTimePage] = useState(1);
  const [timePageSize, setTimePageSize] = useState(25);

  const {
    sortColumn: timeSortColumn,
    sortDirection: timeSortDirection,
    toggleSort: timeToggleSort,
    sortedData: sortedTimeEntries
  } = useTableSort<any>('sc-time-entries', rawTimeEntries, {
    defaultSortColumn: 'logged_date',
    defaultSortDirection: 'desc'
  });

  const paginatedTimeEntries = useMemo(() => {
    const startIndex = (timePage - 1) * timePageSize;
    return sortedTimeEntries.slice(startIndex, startIndex + timePageSize);
  }, [sortedTimeEntries, timePage, timePageSize]);


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
    mutationFn: (value: TimeLogValue) => {
      return logServiceCloudTicketTimeService(workspaceId, ticketId, {
        durationSeconds: value.durationMinutes * 60,
        description: value.description,
        activities: value.activities ?? '',
        logged_date: value.dateTime.split('T')[0],
      });
    },
    onSuccess: async () => {
      toast.success('Time logged');
      setIsTimeLogOpen(false);
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
    mutationFn: (data: {
      duration_seconds: number;
      description: string;
      activities?: string;
      logged_date: string;
    }) => {
      return updateServiceCloudResourceService('time-entries', {
        id: editingLogId,
        workspace_id: workspaceId,
        duration_seconds: data.duration_seconds,
        description: data.description,
        activities: data.activities,
        logged_date: data.logged_date,
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

  const notesQueryKey = ['service-cloud', 'ticket-notes', workspaceId, ticketId, statusFilter];
  const { data: notes = [], isLoading: notesLoading } = useQuery({
    queryKey: notesQueryKey,
    queryFn: () => getNotesService(workspaceId, 'service_cloud_ticket', ticketId, statusFilter),
    enabled: Boolean(workspaceId && ticketId),
  });

  const createNoteMutation = useMutation({
    mutationFn: (content: string) =>
      createNoteService({
        workspace_id: workspaceId,
        entity_type: 'service_cloud_ticket',
        entity_id: ticketId,
        note: content,
      }),
    onSuccess: () => {
      toast.success('Note added');
      setIsNoteModalOpen(false);
      setNoteContent('');
      queryClient.invalidateQueries({ queryKey: notesQueryKey });
    },
    onError: () => toast.error('Failed to add note'),
  });

  const updateNoteMutation = useMutation({
    mutationFn: (payload: { id: string; note?: string; content?: string; is_closed?: boolean }) =>
      updateNoteService({ id: payload.id, workspace_id: workspaceId, note: payload.note, content: payload.content, is_closed: payload.is_closed }),
    onSuccess: (data, variables) => {
      if (variables.is_closed !== undefined) {
        toast.success(variables.is_closed ? 'Note closed' : 'Note reopened');
      } else {
        toast.success('Note updated');
      }
      setIsNoteModalOpen(false);
      setEditingNote(null);
      setNoteContent('');
      queryClient.invalidateQueries({ queryKey: notesQueryKey });
    },
    onError: () => toast.error('Failed to update note'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => deleteNoteService(workspaceId, id),
    onSuccess: () => {
      toast.success('Note deleted');
      setDeletingNoteId(null);
      queryClient.invalidateQueries({ queryKey: notesQueryKey });
    },
    onError: () => toast.error('Failed to delete note'),
  });

  const handleSaveNote = () => {
    if (!noteContent.trim()) return;
    if (editingNote) {
      updateNoteMutation.mutate({ id: editingNote.id, note: noteContent });
    } else {
      createNoteMutation.mutate(noteContent);
    }
  };

  const openEditNoteDialog = (note: any) => {
    setEditingNote(note);
    setNoteContent(note.note || note.content || '');
    setIsNoteModalOpen(true);
  };

  const documentsQueryKey = ['service-cloud', 'ticket-documents', workspaceId, ticketId];
  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: documentsQueryKey,
    queryFn: () => getDocumentsService(workspaceId, 'service_cloud_ticket', ticketId),
    enabled: Boolean(workspaceId && ticketId),
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: (payload: FormData) => uploadDocumentService(payload),
    onSuccess: () => {
      toast.success('Document added');
      setIsDocumentModalOpen(false);
      setDocumentForm({ name: '', file: null, file_url: '', category: '', description: '' });
      queryClient.invalidateQueries({ queryKey: documentsQueryKey });
    },
    onError: () => toast.error('Failed to add document'),
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id: string) => deleteDocumentService(workspaceId, id),
    onSuccess: () => {
      toast.success('Document deleted');
      setDeletingDocumentId(null);
      queryClient.invalidateQueries({ queryKey: documentsQueryKey });
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const handleSaveDocument = () => {
    const { name, category, description, file_url, file } = documentForm;
    if (!name.trim()) {
      toast.error('Document Name is required');
      return;
    }
    if (!file && !file_url.trim()) {
      toast.error('Either File or External URL is required');
      return;
    }

    const payload = new FormData();
    payload.set('workspace_id', workspaceId);
    payload.set('entity_type', 'service_cloud_ticket');
    payload.set('entity_id', ticketId);
    payload.set('name', name);
    if (category) payload.set('category', category);
    if (description) payload.set('description', description);
    if (file_url) payload.set('file_url', file_url);
    if (file) payload.set('file', file);

    uploadDocumentMutation.mutate(payload);
  };

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
          <Button variant="default" className="secondary-text-small-bold bg-leadgaze-primary hover:bg-leadgaze-primary text-white gap-1.5 px-2" onClick={() => setIsTimeLogOpen(true)}>
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
                    Created by <span className="font-bold">{ticket.created_by_account?.name || 'Unknown'}</span> on {formatDate(ticket.created_at)} | {ticket.created_at && new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1 dark:text-white">
                  <span>
                    Assigned to <span className="font-bold">{assignedAgent?.name || 'Unassigned'}</span> on {ticket.updated_at ? formatDate(ticket.updated_at) : formatDate(ticket.created_at)} | {ticket.updated_at ? new Date(ticket.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                      <div className="scrollbar-thin max-h-[350px] space-y-2 overflow-y-auto pr-2">
                        {emails.map((item: any) => {
                          const email = item.email;
                          return (
                            <article
                              key={item.id}
                              className="overflow-hidden border bg-white shadow-sm dark:bg-zinc-950"
                            >
                              <div className="border-b bg-slate-50 p-4 dark:bg-slate-900/60">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-base font-semibold">
                                      <span className="text-leadgaze-dark">Subject:</span> <span className="text-leadgaze-dark">{email?.subject || '(No Subject)'}</span>
                                    </div>
                                    <div className="text-muted-foreground mt-1 text-xs">
                                      {email?.direction === 'inbound'
                                        ? `From: ${email?.from_email}`
                                        : `To: ${emailRecipientText(email)}`}
                                    </div>
                                    {Array.isArray(email?.cc_emails) &&
                                      email.cc_emails.length > 0 ? (
                                      <div className="text-muted-foreground mt-1 text-xs">
                                        Cc: {email.cc_emails.join(', ')}
                                      </div>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex gap-2 flex-row items-center">
                                    {item.email_role && (<Badge variant="outline" className='primary-text-medium ps-0'>
                                      {item.email_role}
                                    </Badge>)}                                    
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setReplyEmail(email)}
                                      className="hover:bg-leadgaze-primary hover:text-white"
                                    >
                                      Reply
                                    </Button>
                                    </div>
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
                                <div className="prose prose-sm max-w-none dark:bg-white dark:text-leadgaze-dark dark:px-4 [&_ol]:list-decimal [&_ol]:ml-4 [&_ul]:list-disc [&_ul]:ml-4">
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

                                {Array.isArray(email?.attachments) && email.attachments.length > 0 && (
                                  <div className="mt-4 border-t pt-3">
                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                                      <Paperclip className="h-3.5 w-3.5 text-blue-500" />
                                      <span>Attachments ({email.attachments.length})</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {email.attachments.map((att: any, attIdx: number) => {
                                        const name = att.name || att.fileName || `Attachment ${attIdx + 1}`;
                                        const sizeStr = formatFileSize(att.size);
                                        return (
                                          <div
                                            key={attIdx}
                                            className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50/70 p-2 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/60"
                                          >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                              <Paperclip className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                              <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-medium text-zinc-900 dark:text-zinc-100" title={name}>
                                                  {name}
                                                </p>
                                                {sizeStr && (
                                                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">{sizeStr}</p>
                                                )}
                                              </div>
                                            </div>
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 gap-1 px-2 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 shrink-0"
                                              onClick={(e) => handleDownloadAttachment(e, att)}
                                              title={`Download ${name}`}
                                            >
                                              <Download className="h-3.5 w-3.5" />
                                              <span>Download</span>
                                            </Button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
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

            <TabsContent value="work" className="max-h-[500px] overflow-y-auto mb-2">
              <div className="flex min-h-0 flex-1 flex-col w-full">
                <CardWidgetContainer
                  title="Time loged"
                  className="flex min-h-0 flex-1 flex-col"
                  contentClassName="flex min-h-0 flex-1 flex-col p-0"
                  headerClassName="p-2 xl:p-2 2xl:p-2 mb-1"
                  icon={<Clock3 className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
                  icon2={
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2 text-sm text-blue-500 hover:text-blue-600"
                      onClick={() => setIsTimeLogOpen(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Add Time
                    </Button>
                  }
                >
                  <div className="flex flex-col min-h-0 flex-1">
                    {timeEntries.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
                          <Clock3 className="h-6 w-6 text-blue-500" />
                        </div>
                        <p className="mt-4 text-sm text-gray-500">No Time loged yet</p>
                      </div>
                    ) : (
                      <PageBody className="sticky flex min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden">
                        <div className="flex min-h-0 w-full min-w-0 max-w-full flex-1 gap-0">
                          <CustomTableContainer
                            pagination={
                              <TablePagination
                                currentPage={timePage}
                                totalPages={Math.ceil(timeEntries.length / timePageSize)}
                                totalCount={timeEntries.length}
                                pageSize={timePageSize}
                                onPageChange={setTimePage}
                                onPageSizeChange={(val) => {
                                  setTimePageSize(val);
                                  setTimePage(1);
                                }}
                              />
                            }
                          >
                            <div className="scrollbar-thin flex-1 overflow-y-auto">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead
                                      className="relative w-[80px]"
                                      {...getHeaderProps('s_no')}
                                    >
                                      <ColumnHeader columnId="s_no" sortColumn={timeSortColumn} sortDirection={timeSortDirection} onSort={() => { }} label="S. No." sortable={false} />
                                      <span
                                        className="col-resize-handle"
                                        {...getResizeHandleProps('s_no')}
                                      />
                                    </TableHead>
                                    <TableHead
                                      className="relative max-w-[150px] cursor-pointer group select-none hover:bg-muted/50"
                                      {...getHeaderProps('activities')}
                                      onClick={() => timeToggleSort('activities')}
                                    >
                                      <div className="flex w-full items-center justify-between gap-1.5 pr-1">
                                        <span className="flex min-w-0 flex-1 items-center truncate">
                                          <span className="truncate">Activities</span>
                                        </span>
                                        {timeSortColumn === 'activities' ? (
                                          timeSortDirection === 'asc' ? <ArrowUp className="h-3 w-3 shrink-0 text-leadgaze-primary" /> : <ArrowDown className="h-3 w-3 shrink-0 text-leadgaze-primary" />
                                        ) : (
                                          <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground opacity-35 transition-opacity group-hover:opacity-100" />
                                        )}
                                      </div>
                                      <span
                                        className="col-resize-handle"
                                        {...getResizeHandleProps('activities')}
                                      />
                                    </TableHead>
                                    <TableHead
                                      className="relative max-w-[200px] cursor-pointer group select-none hover:bg-muted/50"
                                      {...getHeaderProps('description')}
                                      onClick={() => timeToggleSort('description')}
                                    >
                                      <div className="flex w-full items-center justify-between gap-1.5 pr-1">
                                        <span className="flex min-w-0 flex-1 items-center truncate">
                                          <span className="truncate">Description</span>
                                        </span>
                                        {timeSortColumn === 'description' ? (
                                          timeSortDirection === 'asc' ? <ArrowUp className="h-3 w-3 shrink-0 text-leadgaze-primary" /> : <ArrowDown className="h-3 w-3 shrink-0 text-leadgaze-primary" />
                                        ) : (
                                          <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground opacity-35 transition-opacity group-hover:opacity-100" />
                                        )}
                                      </div>
                                      <span
                                        className="col-resize-handle"
                                        {...getResizeHandleProps('description')}
                                      />
                                    </TableHead>
                                    <TableHead
                                      className="relative w-[150px] cursor-pointer group select-none hover:bg-muted/50"
                                      {...getHeaderProps('author')}
                                      onClick={() => timeToggleSort('author')}
                                    >
                                      <div className="flex w-full items-center justify-between gap-1.5 pr-1">
                                        <span className="flex min-w-0 flex-1 items-center truncate">
                                          <span className="truncate">Author</span>
                                        </span>
                                        {timeSortColumn === 'author' ? (
                                          timeSortDirection === 'asc' ? <ArrowUp className="h-3 w-3 shrink-0 text-leadgaze-primary" /> : <ArrowDown className="h-3 w-3 shrink-0 text-leadgaze-primary" />
                                        ) : (
                                          <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground opacity-35 transition-opacity group-hover:opacity-100" />
                                        )}
                                      </div>
                                      <span
                                        className="col-resize-handle"
                                        {...getResizeHandleProps('author')}
                                      />
                                    </TableHead>
                                    <TableHead
                                      className="relative w-[180px] cursor-pointer group select-none hover:bg-muted/50"
                                      {...getHeaderProps('logged_date')}
                                      onClick={() => timeToggleSort('logged_date')}
                                    >
                                      <div className="flex w-full items-center justify-between gap-1.5 pr-1">
                                        <span className="flex min-w-0 flex-1 items-center truncate">
                                          <span className="truncate">Date & Time Log</span>
                                        </span>
                                        {timeSortColumn === 'logged_date' ? (
                                          timeSortDirection === 'asc' ? <ArrowUp className="h-3 w-3 shrink-0 text-leadgaze-primary" /> : <ArrowDown className="h-3 w-3 shrink-0 text-leadgaze-primary" />
                                        ) : (
                                          <ArrowUpDown className="h-3 w-3 shrink-0 text-muted-foreground opacity-35 transition-opacity group-hover:opacity-100" />
                                        )}
                                      </div>
                                      <span
                                        className="col-resize-handle"
                                        {...getResizeHandleProps('logged_date')}
                                      />
                                    </TableHead>
                                    <TableHead className="w-[100px] text-center">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {paginatedTimeEntries.map(
                                    (entry: any, index: number) => (
                                      <TableRow key={entry.id}>
                                        <TableCell>{(timePage - 1) * timePageSize + index + 1}</TableCell>
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
                                            <span className="text-gray-400 whitespace-nowrap">({formatDuration(entry.duration_seconds)})</span>
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

            <TabsContent value="notes" className="max-h-[500px] overflow-y-auto mb-2">
              <CardWidgetContainer
                title="Notes"
                headerClassName="p-2 xl:p-2 2xl:p-2 mb-1"
                icon={<FileText className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
                icon2={
                  <div className="flex items-center gap-2">
                    <Tabs
                      value={statusFilter}
                      onValueChange={(val) => setStatusFilter(val as 'active' | 'closed')}
                      className="w-fit"
                    >
                      <TabsList className="h-8 p-1">
                        <TabsTrigger value="active" className="h-6 text-xs px-3">Active</TabsTrigger>
                        <TabsTrigger value="closed" className="h-6 text-xs px-3">Closed</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-sm text-blue-500 hover:text-blue-600"
                      onClick={() => {
                        setEditingNote(null);
                        setNoteContent('');
                        setIsNoteModalOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Add Note
                    </Button>
                  </div>
                }
              >
                <div className="p-2">


                  {notesLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : notes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF] dark:bg-slate-900">
                        <FileText className="h-6 w-6 text-blue-500" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">No notes yet</p>
                    </div>
                  ) : (
                    <div className="relative border-l border-gray-200 dark:border-gray-800 ml-2.5 pl-4 space-y-5 py-1">
                      {notes.map((note: any) => (
                        <div key={note.id} className="relative group">
                          <div className={`absolute -left-[22.5px] top-1.5 h-2 w-2 rounded-full border border-white dark:border-gray-950 ${note.is_closed
                            ? 'bg-gray-300 dark:bg-gray-700'
                            : 'bg-blue-500'
                            }`} />

                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 text-[12px]">
                                <span className="primary-text-medium text-leadgaze-dark dark:text-white">
                                  {note.created_by_user?.name || members.find((m: any) => m.id === note.created_by)?.name || 'Unknown User'}
                                </span>
                                <span className="text-gray-300 dark:text-gray-700">•</span>
                                <span className="text-gray-400 dark:text-gray-500">
                                  {formatDate(note.created_at)}
                                </span>
                              </div>

                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                {statusFilter === 'active' ? (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => updateNoteMutation.mutate({ id: note.id, is_closed: true })}
                                    className="h-6 w-6 rounded text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    title="Close Note"
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => updateNoteMutation.mutate({ id: note.id, is_closed: false })}
                                    className="h-6 w-6 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    title="Reopen Note"
                                  >
                                    <RotateCcw className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditNoteDialog(note)}
                                  className="h-6 w-6 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  title="Edit Note"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setDeletingNoteId(note.id);
                                  }}
                                  className="h-6 w-6 rounded text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                                  title="Delete Note"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>

                            <p
                              className={`cursor-pointer text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap ${note.is_closed
                                ? 'text-gray-400 line-through dark:text-gray-500'
                                : ''
                                }`}
                              onClick={() => openEditNoteDialog(note)}
                            >
                              {note.note || note.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardWidgetContainer>
            </TabsContent>

            <TabsContent value="documents" className="max-h-[500px] overflow-y-auto mb-2">
              <CardWidgetContainer
                title="Document"
                headerClassName="p-2 xl:p-2 2xl:p-2"
                icon={<FileText className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
                icon2={
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-2 text-sm text-blue-500 hover:text-blue-600"
                    onClick={() => {
                      setDocumentForm({ name: '', file: null, file_url: '', category: '', description: '' });
                      setIsDocumentModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Add Document
                  </Button>
                }
              >
                <div className="px-2 pb-2 pt-2">
                  {documentsLoading ? (
                    <div className="flex justify-center py-4">
                      <Skeleton className="h-8 w-8 rounded-full" />
                    </div>
                  ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF] dark:bg-slate-900">
                        <Mail className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">No Document added yet</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documents.map((d: any) => (
                        <div key={d.id} className="border border-gray-200 dark:border-slate-800 p-2 mb-2 flex justify-between items-start bg-white dark:bg-zinc-950">
                          <div>
                            <div className="primary-text-big-regular text-leadgaze-dark dark:text-white !font-normal">
                              {d.file_url || d.file_path ? (
                                <a className="primary-text-big-regular underline-offset-4 hover:underline text-blue-600" href={d.file_url ?? d.file_path} target="_blank" rel="noreferrer">
                                  {d.name}
                                </a>
                              ) : d.name}
                              {d.category && <Badge variant="outline" className="ml-2 font-normal text-xs">{d.category}</Badge>}
                            </div>
                            {d.description && <div className="secondary-text-small-regular text-leadgaze-muted dark:text-gray-400">{d.description}</div>}
                            <div className="secondary-text-small-regular text-leadgaze-muted dark:text-white">
                              Added on {formatDateOnly(d.created_at)} | {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-4">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                              onClick={() => setDeletingDocumentId(d.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardWidgetContainer>
            </TabsContent>

            <TabsContent value="activity" className="max-h-[500px] overflow-y-auto mb-2">
              <CardWidgetContainer
                title="Ticket Activity"
                headerClassName="p-2 xl:p-2 2xl:p-2"
                icon={<Clock className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
                icon2={
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => refetchTicketDetail()}
                    disabled={isFetchingTicketDetail}
                    className="h-7 gap-1 px-2 text-xs text-blue-500 hover:text-blue-600"
                    title="Refresh activity logs"
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', isFetchingTicketDetail && 'animate-spin')} />
                    <span>Refresh</span>
                  </Button>
                }
              >
                <div className="px-0 mb-2">
                  {(data.activities ?? []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF] dark:bg-slate-900">
                        <Clock className="h-6 w-6 text-gray-500" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">No Activity yet</p>
                    </div>
                  ) : (
                    <div className="max-h-[350px] overflow-y-auto divide-y divide-gray-100 border border-gray-200 bg-white dark:divide-gray-800/60 dark:border-gray-800 dark:bg-slate-950">
                      {data.activities.map((activity: any) => {
                        const details = getActivityUIDetails(activity);
                        const name = activity.summary || eventLabel(activity.event_type);

                        return (
                          <div
                            key={activity.id}
                            className="flex flex-col justify-center gap-1.5 px-3 py-1.5 text-xs transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/60"
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <div className="shrink-0">{details.icon}</div>
                                <span className="font-semibold text-leadgaze-dark shrink-0 dark:text-white text-xs">
                                  {details.module}
                                </span>
                                {(activity.from_value?.label || activity.to_value?.label) && (
                                  <span className="text-muted-foreground text-xs shrink-0">
                                    {activity.from_value?.label ?? 'None'} &rarr; {activity.to_value?.label ?? 'None'}
                                  </span>
                                )}
                                {getActionBadge(details.action, details.color)}
                                {name && (
                                  <span className="font-medium text-gray-800 truncate dark:text-gray-200 text-xs">
                                    {name}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                <span>by {actorLabel(activity)}</span>
                                <span className="hidden sm:inline">•</span>
                                <span className="whitespace-nowrap">{formatDateOnly(activity.created_at)} | {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                      icon={<LayoutGrid className="h-5 w-5" />}
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
                refetchTicketDetail();
                void queryClient.invalidateQueries({ queryKey });
              }
            }}
            onSuccess={() => {
              refetchTicketDetail();
              void queryClient.invalidateQueries({ queryKey });
            }}
            workspaceId={workspaceId}
            email={replyEmail}
            accounts={emailAccounts}
            entityType="service_cloud_ticket"
            entityId={ticketId}
            templateContext={ticketTemplateContext}
          />
          <CoreEmailComposeDialog
            open={isComposeOpen}
            onOpenChange={(open) => {
              setIsComposeOpen(open);
              if (!open) {
                refetchTicketDetail();
                void queryClient.invalidateQueries({ queryKey });
              }
            }}
            onSuccess={() => {
              refetchTicketDetail();
              void queryClient.invalidateQueries({ queryKey });
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

      <CustomTimeLog
        open={isTimeLogOpen}
        onOpenChange={setIsTimeLogOpen}
        title="Time Log on Task"
        showActivities={true}
        onSave={(val) => timeMutation.mutate(val)}
        isSaving={timeMutation.isPending}
      />

      <CustomTimeLog
        open={Boolean(editingLogId)}
        onOpenChange={(open) => {
          if (!open) setEditingLogId(null);
        }}
        title="Edit Time Entry"
        showActivities={true}
        initialDuration={(() => {
          const parts = [];
          if (editForm.hours) parts.push(`${editForm.hours}h`);
          if (editForm.minutes) parts.push(`${editForm.minutes}m`);
          return parts.join(' ');
        })()}
        initialDate={
          editForm.logged_date
            ? new Date(editForm.logged_date + 'T00:00:00')
            : undefined
        }
        initialDescription={editForm.description}
        initialActivities={editForm.activities}
        onSave={(val) => {
          updateTimeMutation.mutate({
            duration_seconds: val.durationMinutes * 60,
            description: val.description,
            activities: val.activities,
            logged_date: val.dateTime.split('T')[0] as string,
          });
        }}
        isSaving={updateTimeMutation.isPending}
      />

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

      <Dialog
        open={isNoteModalOpen}
        onOpenChange={(open) => !open && setIsNoteModalOpen(false)}
      >
        <DialogContent className="sm:max-w-[500px] flex max-h-[90vh] flex-col p-0 overflow-hidden border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-950">

          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Edit Note' : 'Add Note'}
            </DialogTitle>
          </DialogHeader>
          <div className="custom-spacing-x-y py-2">
            <Label htmlFor="note_content" className="text-sm font-medium">Write Note</Label>
            <Textarea
              id="note_content"
              placeholder="Write Note"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="min-h-[120px] resize-none border-gray-300 dark:border-slate-700"
              autoFocus
              onFocus={(e) => {
                const length = e.currentTarget.value.length;
                e.currentTarget.setSelectionRange(length, length);
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNoteModalOpen(false)}
              disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="secondary-text-small-bold !text-white gap-1.5 px-2"
              onClick={handleSaveNote}
              disabled={createNoteMutation.isPending || updateNoteMutation.isPending || !noteContent.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingNoteId)}
        onOpenChange={(open) => !open && setDeletingNoteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the note. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingNoteId) {
                  deleteNoteMutation.mutate(deletingNoteId);
                }
              }}
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={isDocumentModalOpen}
        onOpenChange={(open) => !open && setIsDocumentModalOpen(false)}
      >
        <DialogContent className="sm:max-w-[600px] flex max-h-[90vh] flex-col p-0 overflow-hidden border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 overflow-y-auto custom-spacing-x-y py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="doc_name" className="text-sm font-medium text-gray-700 dark:text-gray-300">Document Name</Label>
                <Input
                  id="doc_name"
                  placeholder="Document Name"
                  value={documentForm.name}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="doc_category" className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</Label>
                <Input
                  id="doc_category"
                  placeholder="Category"
                  value={documentForm.category}
                  onChange={(e) => setDocumentForm(prev => ({ ...prev, category: e.target.value }))}
                />
              </div>
            </div>

            <div className="relative rounded-md border border-dashed border-gray-300 dark:border-slate-700 p-6 flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/50 text-center">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setDocumentForm(prev => ({
                    ...prev,
                    file,
                    name: prev.name || file?.name || ''
                  }));
                }}
              />
              <div className="flex h-10 w-10 items-center justify-center shadow-sm mb-3 rounded-full border border-gray-100 bg-white dark:bg-slate-800 dark:border-slate-700">
                <CloudUpload className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drag and drop files here
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or <span className="text-[#0052CC] cursor-pointer font-bold">Browse files</span>
              </p>
              {documentForm.file && (
                <p className="text-xs text-green-600 mt-2 font-medium bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-md">{documentForm.file.name}</p>
              )}
            </div>

            <div className="relative flex items-center">
              <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
              <span className="mx-4 flex-shrink-0 text-xs font-semibold uppercase text-gray-400">Or provide a link</span>
              <div className="flex-grow border-t border-gray-200 dark:border-slate-800"></div>
            </div>

            <div>
              <Label htmlFor="doc_url" className="text-sm font-medium text-gray-700 dark:text-gray-300">External URL</Label>
              <Input
                id="doc_url"
                placeholder="https://"
                value={documentForm.file_url}
                onChange={(e) => setDocumentForm(prev => ({ ...prev, file_url: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="doc_desc" className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</Label>
              <Textarea
                id="doc_desc"
                placeholder="Write your message"
                value={documentForm.description}
                onChange={(e) => setDocumentForm(prev => ({ ...prev, description: e.target.value }))}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDocumentModalOpen(false)}
              disabled={uploadDocumentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="secondary-text-small-bold !text-white gap-1.5 px-2"
              onClick={handleSaveDocument}
              disabled={uploadDocumentMutation.isPending || !documentForm.name.trim() || (!documentForm.file && !documentForm.file_url.trim())}
            >
              Add Document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(deletingDocumentId)}
        onOpenChange={(open) => !open && setDeletingDocumentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the document. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingDocumentId) {
                  deleteDocumentMutation.mutate(deletingDocumentId);
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
            <SelectTrigger className="ml-auto w-[220px]">
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
