'use client';

import React, { useEffect, useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Calendar as CalendarIcon,
  Check,
  Clock,
  ExternalLink,
  Eye,
  Link2,
  Loader2,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  type CoreMeeting,
  type MeetingProvider,
  type MeetingStatus,
  type MeetingType,
  cancelMeetingService,
  createGoogleMeetingService,
  createMeetingNoteService,
  createMeetingService,
  createZoomMeetingService,
  deleteMeetingService,
  getIntegrationAccountsService,
  getMeetingNotesService,
  getMeetingsService,
  updateMeetingService,
} from '@kit/core/services';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Badge } from '@kit/ui/badge';
import { AddColumnModal } from '@kit/ui/add-column-modal';
import { Button } from '@kit/ui/button';
import { ColumnVisibilitySelector } from '@kit/ui/column-visibility-selector';
import { CustomTableContainer } from '@kit/ui/custom-table-container';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { Input } from '@kit/ui/input';
import { DateTimePicker } from '@kit/ui/datetime-picker';
import { format } from 'date-fns';
import { Label } from '@kit/ui/label';
import { ListToolBar } from '@kit/ui/list-toolbar';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Skeleton } from '@kit/ui/skeleton';
import { SortableTableHead } from '@kit/ui/sortable-table-head';
import { StatusFilterDropdown } from '@kit/ui/status-filter-dropdown';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@kit/ui/table';
import { TablePagination } from '@kit/ui/table-pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Textarea } from '@kit/ui/textarea';
import { useColumnResize } from '@kit/ui/use-column-resize';
import { useColumnVisibility } from '@kit/ui/use-column-visibility';
import { useDateRangeFilter } from '@kit/ui/use-date-range-filter';
import { useTableSort } from '@kit/ui/use-table-sort';

import { usePackageMembers } from '~/lib/hooks/use-package-members';
import { useDebounce } from '~/lib/hooks/use-debounce';
import { useRBAC } from '~/lib/rbac/rbac-provider';
import { getAccountsService } from '~/services/accounts.service';
import { getContactsService } from '~/services/contacts.service';
import { getLeadsService } from '~/services/leads.service';
import { getOpportunitiesService } from '~/services/opportunities.service';
import {
  convertLocalTimeToUTC,
  convertUTCToLocalTime,
} from '~/utils/timezone-helpers';

// =============================================================================
// CONSTANTS
// =============================================================================

const MEETING_TYPES: {
  value: MeetingType;
  label: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'scheduled',
    label: 'Scheduled Meeting',
    icon: <CalendarIcon className="h-4 w-4" />,
  },
  {
    value: 'logged',
    label: 'Log Past Meeting',
    icon: <Clock className="h-4 w-4" />,
  },
];

const PROVIDER_CARDS: {
  value: MeetingProvider;
  label: string;
  icon: React.ReactNode;
  selectedBg: string;
}[] = [
  {
    value: 'GOOGLE',
    label: 'Google Meet',
    icon: (
      <Image
        src={'/images/icons/google-meet.png'}
        width={32}
        height={32}
        className="h-7 w-8"
        alt="Google Meet"
      />
    ),
    selectedBg: 'bg-blue-50/50',
  },
  {
    value: 'ZOOM',
    label: 'Zoom Meeting',
    icon: (
      <Image
        src={'/images/icons/zoom.webp'}
        width={32}
        height={32}
        className="h-8 w-8"
        alt="Google Meet"
      />
    ),
    selectedBg: 'bg-blue-50/50',
  },
  {
    value: 'MANUAL',
    label: 'Manual Link',
    icon: <Link2 className="h-8 w-8 text-gray-400" />,
    selectedBg: 'bg-gray-50',
  },
];

const STATUS_CONFIG: Record<
  MeetingStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  scheduled: {
    label: 'Scheduled',
    color: '#3B82F6',
    icon: <CalendarIcon className="h-3.5 w-3.5" />,
  },
  in_progress: {
    label: 'In Progress',
    color: '#F59E0B',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  completed: {
    label: 'Completed',
    color: '#10B981',
    icon: <Check className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: '#EF4444',
    icon: <X className="h-3.5 w-3.5" />,
  },
};

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

const REMINDER_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 1440, label: '1 day' },
];

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
];

const meetingStatuses = (Object.keys(STATUS_CONFIG) as MeetingStatus[]).map(
  (key) => ({
    id: key,
    status_name: STATUS_CONFIG[key].label,
    color: STATUS_CONFIG[key].color,
  }),
);

// =============================================================================
// HELPERS
// =============================================================================

function formatMeetingTime(
  start?: string | null,
  end?: string | null,
  meetingTz?: string | null,
  userTz?: string | null,
): string {
  if (!start) return 'No time set';
  const tz =
    userTz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const originalTz = meetingTz || 'UTC';
  const startDate = new Date(start);

  const formatDateForTz = (date: Date, targetTz: string) => {
    const dateStr = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: targetTz,
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: targetTz,
    });
    return { dateStr, timeStr };
  };

  const startFormatted = formatDateForTz(startDate, tz);
  let mainStr = '';
  if (end) {
    const endDate = new Date(end);
    const endFormatted = formatDateForTz(endDate, tz);
    if (startFormatted.dateStr === endFormatted.dateStr) {
      mainStr = `${startFormatted.dateStr}, ${startFormatted.timeStr} – ${endFormatted.timeStr} (${tz})`;
    } else {
      mainStr = `${startFormatted.dateStr} ${startFormatted.timeStr} – ${endFormatted.dateStr} ${endFormatted.timeStr} (${tz})`;
    }
  } else {
    mainStr = `${startFormatted.dateStr} at ${startFormatted.timeStr} (${tz})`;
  }

  if (originalTz.toUpperCase() !== tz.toUpperCase()) {
    const startOrig = formatDateForTz(startDate, originalTz);
    let origStr = '';
    if (end) {
      const endDate = new Date(end);
      const endOrig = formatDateForTz(endDate, originalTz);
      if (startOrig.dateStr === endOrig.dateStr) {
        origStr = `${startOrig.timeStr} – ${endOrig.timeStr} ${originalTz}`;
      } else {
        origStr = `${startOrig.dateStr} ${startOrig.timeStr} – ${endOrig.dateStr} ${endOrig.timeStr} ${originalTz}`;
      }
    } else {
      origStr = `${startOrig.timeStr} ${originalTz}`;
    }
    return `${mainStr} [${origStr}]`;
  }

  return mainStr;
}

// Get current datetime in format required by datetime-local input (YYYY-MM-DDTHH:mm)
function getCurrentDateTimeLocal(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const localDate = new Date(now.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function getProviderBadge(provider: MeetingProvider) {
  switch (provider) {
    case 'GOOGLE':
      return {
        label: 'Google Meet',
        icon: (
          <Image
            src={'/images/icons/google-meet.png'}
            width={32}
            height={32}
            className="h-3 w-4"
            alt="Google Meet"
          />
        ),
        cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      };
    case 'ZOOM':
      return {
        label: 'Zoom',
        icon: (
          <Image
            src={'/images/icons/zoom.webp'}
            width={32}
            height={32}
            className="h-4 w-4"
            alt="Zoom"
          />
        ),
        cls: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      };
    default:
      return {
        label: 'Manual',
        icon: <Link2 className="h-4 w-4" />,
        cls: 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900 dark:text-gray-400 dark:border-gray-700',
      };
  }
}

function getStatusBadge(status: MeetingStatus) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.scheduled;
  return cfg;
}

// =============================================================================
// TYPES
// =============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EntityRecord = any;

type IntegrationAccountRow = {
  id: string;
  connection?: { provider?: string } | null;
  email?: string | null;
  display_name?: string | null;
};

// =============================================================================
// SKELETON
// =============================================================================

function MeetingsPageSkeleton({ colSpan = 7 }: { colSpan?: number }) {
  return (
    <>
      {[...Array(8)].map((_, i) => (
        <TableRow key={i}>
          <TableCell className="h-[32px] px-4 py-2" colSpan={colSpan}>
            <Skeleton className="h-7 w-full rounded-md" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// =============================================================================
// PROVIDER SELECTOR COMPONENT
// =============================================================================

function ProviderSelector({
  value,
  onChange,
}: {
  value: MeetingProvider;
  onChange: (v: MeetingProvider) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {PROVIDER_CARDS.map((p) => {
        const isSelected = value === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`relative flex flex-col items-center gap-2.5 rounded-xl border-2 p-4 transition-all ${
              isSelected
                ? `border-blue-500 ${p.selectedBg} shadow-sm`
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900'
            }`}
          >
            {isSelected && (
              <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                <Check className="h-3 w-3 text-white" />
              </div>
            )}
            {p.icon}
            <span
              className={`text-xs font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-500'}`}
            >
              {p.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// MEETING TYPE TOGGLE
// =============================================================================

function MeetingTypeToggle({
  value,
  onChange,
}: {
  value: MeetingType;
  onChange: (v: MeetingType) => void;
}) {
  return (
    <div className="flex gap-2">
      {MEETING_TYPES.map((type) => (
        <button
          key={type.value}
          type="button"
          onClick={() => onChange(type.value)}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
            value === type.value
              ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-400 dark:bg-blue-950 dark:text-blue-300'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
          }`}
        >
          {type.icon}
          {type.label}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// CREATE MEETING DIALOG
// =============================================================================

export interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  integrationAccounts?: IntegrationAccountRow[];
  leads?: EntityRecord[];
  contacts?: EntityRecord[];
  accounts?: EntityRecord[];
  opportunities?: EntityRecord[];
  initialType?: MeetingType;
  onSuccess: () => void;
  initialEntityType?: string;
  initialEntityId?: string;
}

export function CreateMeetingDialog({
  open,
  onOpenChange,
  workspaceId,
  integrationAccounts,
  leads,
  contacts,
  accounts: crmAccounts,
  opportunities,
  initialType = 'scheduled',
  onSuccess,
  initialEntityType,
  initialEntityId,
}: CreateMeetingDialogProps) {
  // Query internal values if props not provided or empty
  const { data: fetchedIntegrationAccounts = [] } = useQuery({
    queryKey: ['integration-accounts', workspaceId],
    queryFn: () => getIntegrationAccountsService(workspaceId),
    enabled:
      !!workspaceId &&
      (!integrationAccounts || integrationAccounts.length === 0) &&
      open,
  });

  const { data: fetchedLeads = [] } = useQuery({
    queryKey: ['leads', workspaceId],
    queryFn: async () => {
      const res = await getLeadsService({ workspaceId });
      return res?.data ?? [];
    },
    enabled: !!workspaceId && (!leads || leads.length === 0) && open,
  });

  const { data: fetchedContacts = [] } = useQuery({
    queryKey: ['contacts', workspaceId],
    queryFn: async () => {
      const res = await getContactsService({ workspaceId });
      return res?.data ?? [];
    },
    enabled: !!workspaceId && (!contacts || contacts.length === 0) && open,
  });

  const { data: fetchedAccounts = [] } = useQuery({
    queryKey: ['crm-accounts', workspaceId],
    queryFn: async () => {
      const res = await getAccountsService({ workspaceId });
      return res?.data ?? [];
    },
    enabled:
      !!workspaceId && (!crmAccounts || crmAccounts.length === 0) && open,
  });

  const { data: fetchedOpportunities = [] } = useQuery({
    queryKey: ['opportunities', workspaceId],
    queryFn: async () => {
      const res = await getOpportunitiesService({ workspaceId });
      return res?.data ?? [];
    },
    enabled:
      !!workspaceId && (!opportunities || opportunities.length === 0) && open,
  });

  const resolvedIntegrationAccounts = ((integrationAccounts && integrationAccounts.length > 0) ? integrationAccounts : fetchedIntegrationAccounts) || [];
  const resolvedLeads = ((leads && leads.length > 0) ? leads : fetchedLeads) || [];
  const resolvedContacts = ((contacts && contacts.length > 0) ? contacts : fetchedContacts) || [];
  const resolvedAccounts = ((crmAccounts && crmAccounts.length > 0) ? crmAccounts : fetchedAccounts) || [];
  const resolvedOpportunities = ((opportunities && opportunities.length > 0) ? opportunities : fetchedOpportunities) || [];

  const [meetingType, setMeetingType] = useState<MeetingType>(initialType);
  const [provider, setProvider] = useState<MeetingProvider>('GOOGLE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [duration, setDuration] = useState(30);
  const [actualStart, setActualStart] = useState('');
  const [actualEnd, setActualEnd] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [location, setLocation] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [entityType, setEntityType] = useState(initialEntityType || 'lead');
  const [entityId, setEntityId] = useState(initialEntityId || '');
  const [externalEmails, setExternalEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [reminders, setReminders] = useState<number[]>([30]);
  const [isCreatingGoogleMeeting, setIsCreatingGoogleMeeting] = useState(false);
  const [isCreatingZoomMeeting, setIsCreatingZoomMeeting] = useState(false);

  const _queryClient = useQueryClient();

  // Reset form with initials if provided
  useEffect(() => {
    if (open) {
      if (initialEntityType) setEntityType(initialEntityType);
      if (initialEntityId) setEntityId(initialEntityId);
    }
  }, [open, initialEntityType, initialEntityId]);

  const resetForm = () => {
    setMeetingType('scheduled');
    setProvider('GOOGLE');
    setTitle('');
    setDescription('');
    setScheduledStart('');
    setDuration(30);
    setActualStart('');
    setActualEnd('');
    setTimezone('UTC');
    setMeetingUrl('');
    setLocation('');
    setSelectedAccountId('');
    setEntityType(initialEntityType || 'lead');
    setEntityId(initialEntityId || '');
    setExternalEmails([]);
    setNewEmail('');
    setReminders([30]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Helper to compute end time from start time + duration (in minutes)
  const getEndTime = (): string => {
    if (!scheduledStart) return '';
    const utcStart = convertLocalTimeToUTC(scheduledStart, timezone);
    if (!utcStart) return '';
    const start = new Date(utcStart);
    start.setMinutes(start.getMinutes() + duration);
    return start.toISOString();
  };

  const handleAddEmail = () => {
    if (
      newEmail &&
      newEmail.includes('@') &&
      !externalEmails.includes(newEmail)
    ) {
      setExternalEmails([...externalEmails, newEmail]);
      setNewEmail('');
    }
  };
  const handleRemoveEmail = (email: string) =>
    setExternalEmails(externalEmails.filter((e) => e !== email));

  const createMutation = useMutation({
    mutationFn: async () => {
      const utcScheduledStart = scheduledStart
        ? convertLocalTimeToUTC(scheduledStart, timezone)
        : '';
      const utcActualStart = actualStart
        ? convertLocalTimeToUTC(actualStart, timezone)
        : '';
      const utcActualEnd = actualEnd
        ? convertLocalTimeToUTC(actualEnd, timezone)
        : '';

      if (
        provider === 'GOOGLE' &&
        selectedAccountId &&
        meetingType === 'scheduled'
      ) {
        setIsCreatingGoogleMeeting(true);
        try {
          const googleResult = await createGoogleMeetingService({
            workspace_id: workspaceId,
            account_id: selectedAccountId,
            title,
            description: description || undefined,
            start_time: utcScheduledStart,
            end_time: getEndTime(),
            timezone,
            attendees: externalEmails.map((email) => ({ email })),
            send_invites: true,
          });
          return createMeetingService({
            workspace_id: workspaceId,
            meeting_type: meetingType,
            provider,
            title,
            description: description || undefined,
            scheduled_start: utcScheduledStart,
            scheduled_end: getEndTime(),
            timezone,
            meeting_url: googleResult.meeting_url,
            provider_event_id: googleResult.provider_event_id,
            provider_meeting_id: googleResult.provider_meeting_id,
            meeting_host_email_account_id: selectedAccountId,
            location: location || undefined,
            entity_type: entityType || undefined,
            entity_id: entityId || undefined,
            participants: externalEmails.map((email) => ({
              participant_type: 'EXTERNAL' as const,
              external_email: email,
              display_name: email,
            })),
            reminders: reminders.map((offset) => ({
              offset_minutes: offset,
              channel: 'EMAIL' as const,
            })),
          });
        } catch (error) {
          console.error(
            '[createMeeting] Google meeting creation failed:',
            error,
          );
          throw new Error(
            'Due to integration error, meeting was not created. Please try again or contact the support team.',
          );
        } finally {
          setIsCreatingGoogleMeeting(false);
        }
      }
      if (
        provider === 'ZOOM' &&
        selectedAccountId &&
        meetingType === 'scheduled'
      ) {
        setIsCreatingZoomMeeting(true);
        try {
          const zoomResult = await createZoomMeetingService({
            workspace_id: workspaceId,
            account_id: selectedAccountId,
            title,
            description: description || undefined,
            start_time: utcScheduledStart,
            end_time: getEndTime(),
            timezone,
            attendees: externalEmails.map((email) => ({ email })),
          });
          return createMeetingService({
            workspace_id: workspaceId,
            meeting_type: meetingType,
            provider,
            title,
            description: description || undefined,
            scheduled_start: utcScheduledStart,
            scheduled_end: getEndTime(),
            timezone,
            meeting_url: zoomResult.meeting_url,
            provider_event_id: zoomResult.provider_event_id,
            provider_meeting_id: zoomResult.provider_meeting_id,
            meeting_host_email_account_id: selectedAccountId,
            location: location || undefined,
            entity_type: entityType || undefined,
            entity_id: entityId || undefined,
            participants: externalEmails.map((email) => ({
              participant_type: 'EXTERNAL' as const,
              external_email: email,
              display_name: email,
            })),
            reminders: reminders.map((offset) => ({
              offset_minutes: offset,
              channel: 'EMAIL' as const,
            })),
          });
        } catch (error) {
          console.error('[createMeeting] Zoom meeting creation failed:', error);
          throw new Error(
            'Due to integration error, meeting was not created. Please try again or contact the support team.',
          );
        } finally {
          setIsCreatingZoomMeeting(false);
        }
      }
      return createMeetingService({
        workspace_id: workspaceId,
        meeting_type: meetingType,
        provider,
        title,
        description: description || undefined,
        scheduled_start:
          meetingType === 'scheduled' && utcScheduledStart
            ? utcScheduledStart
            : undefined,
        scheduled_end:
          meetingType === 'scheduled' && utcScheduledStart
            ? getEndTime()
            : undefined,
        actual_start:
          meetingType === 'logged' && utcActualStart
            ? utcActualStart
            : undefined,
        actual_end:
          meetingType === 'logged' && utcActualEnd ? utcActualEnd : undefined,
        timezone,
        meeting_url: meetingUrl || undefined,
        location: location || undefined,
        entity_type: entityType || undefined,
        entity_id: entityId || undefined,
        participants: externalEmails.map((email) => ({
          participant_type: 'EXTERNAL' as const,
          external_email: email,
          display_name: email,
        })),
        reminders:
          meetingType === 'scheduled'
            ? reminders.map((offset) => ({
                offset_minutes: offset,
                channel: 'EMAIL' as const,
              }))
            : undefined,
      });
    },
    onSuccess: () => {
      toast.success(
        meetingType === 'logged' ? 'Meeting logged' : 'Meeting scheduled',
      );
      handleClose();
      onSuccess();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create meeting');
    },
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (meetingType === 'scheduled' && !scheduledStart) {
      toast.error('Start time is required');
      return;
    }
    if (meetingType === 'logged' && (!actualStart || !actualEnd)) {
      toast.error('Start and end times are required');
      return;
    }
    createMutation.mutate();
  };

  const googleAccounts = resolvedIntegrationAccounts.filter(
    (acc: any) => acc.connection?.provider === 'GOOGLE',
  );
  const zoomAccounts = resolvedIntegrationAccounts.filter(
    (acc: any) => acc.connection?.provider === 'ZOOM',
  );
  const isBusy =
    createMutation.isPending ||
    isCreatingGoogleMeeting ||
    isCreatingZoomMeeting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-y-auto p-0">
        <div className="bg-background sticky top-0 z-10 border-b px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Schedule Meeting
            </DialogTitle>
            <p className="text-muted-foreground text-sm">
              Setup a new engagement with your lead.
            </p>
          </DialogHeader>
        </div>

        <div className="space-y-5 px-6 py-5">
          {/* Meeting Type */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Meeting Type
            </Label>
            <MeetingTypeToggle value={meetingType} onChange={setMeetingType} />
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
              Meeting Provider
            </Label>
            <ProviderSelector
              value={provider}
              onChange={(v) => {
                setProvider(v);
                setSelectedAccountId('');
              }}
            />
          </div>

          {/* Account Selection */}
          {meetingType === 'scheduled' && provider === 'GOOGLE' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Connect As
              </Label>
              {googleAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3 text-center dark:border-blue-800 dark:bg-blue-950/50">
                  <p className="text-sm">
                    No Google accounts.{' '}
                    <a
                      href="/home/workspace-settings#meetings"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Manage Accounts
                    </a>
                  </p>
                </div>
              ) : (
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Google account" />
                  </SelectTrigger>
                  <SelectContent>
                    {googleAccounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.email || acc.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}
          {meetingType === 'scheduled' && provider === 'ZOOM' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider text-gray-500 uppercase">
                Connect As
              </Label>
              {zoomAccounts.length === 0 ? (
                <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-3 text-center dark:border-blue-800 dark:bg-blue-950/50">
                  <p className="text-sm">
                    No Zoom accounts.{' '}
                    <a
                      href="/home/workspace-settings#meetings"
                      className="font-medium text-blue-600 hover:underline"
                    >
                      Manage Accounts
                    </a>
                  </p>
                </div>
              ) : (
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select Zoom account" />
                  </SelectTrigger>
                  <SelectContent>
                    {zoomAccounts.map((acc: any) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.email || acc.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label className="font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Product Demo with Sales Team"
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="font-medium">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes or agenda for the meeting..."
              rows={3}
            />
          </div>

          {/* Time Selection */}
          {meetingType === 'scheduled' ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-medium">
                  Meeting Date & Time <span className="text-red-500">*</span>
                </Label>
                <DateTimePicker
                  value={scheduledStart ? new Date(scheduledStart) : undefined}
                  onChange={(date) => {
                    if (date) {
                      setScheduledStart(format(date, "yyyy-MM-dd'T'HH:mm"));
                    } else {
                      setScheduledStart('');
                    }
                  }}
                  minDate={new Date()}
                  className="h-11 w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Duration</Label>
                <Select
                  value={String(duration)}
                  onValueChange={(val) => setDuration(Number(val))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-medium">
                  Actual Start <span className="text-red-500">*</span>
                </Label>
                <DateTimePicker
                  value={actualStart ? new Date(actualStart) : undefined}
                  onChange={(date) => {
                    if (date) {
                      setActualStart(format(date, "yyyy-MM-dd'T'HH:mm"));
                    } else {
                      setActualStart('');
                    }
                  }}
                  className="h-11 w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">
                  Actual End <span className="text-red-500">*</span>
                </Label>
                <DateTimePicker
                  value={actualEnd ? new Date(actualEnd) : undefined}
                  onChange={(date) => {
                    if (date) {
                      setActualEnd(format(date, "yyyy-MM-dd'T'HH:mm"));
                    } else {
                      setActualEnd('');
                    }
                  }}
                  className="h-11 w-full"
                />
              </div>
            </div>
          )}

          {/* Timezone + Location/URL */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-medium">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {provider === 'MANUAL' ? (
              <div className="space-y-2">
                <Label className="font-medium">Meeting URL</Label>
                <Input
                  value={meetingUrl}
                  onChange={(e) => setMeetingUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-11"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="font-medium">Location</Label>
                <div className="relative">
                  <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add physical address"
                    className="h-11 pl-10"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Meeting URL for logged meetings (optional) */}
          {meetingType === 'logged' && provider !== 'MANUAL' && (
            <div className="space-y-2">
              <Label className="font-medium">Meeting URL (Optional)</Label>
              <Input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://..."
                className="h-11"
              />
            </div>
          )}

          {/* External Invitees */}
          {meetingType === 'scheduled' && (
            <div className="space-y-2">
              <Label className="font-medium">External Invitees</Label>
              <div className="flex gap-2">
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="h-11"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddEmail}
                  className="h-11 w-11"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {externalEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {externalEmails.map((email) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {email}
                      <button
                        onClick={() => handleRemoveEmail(email)}
                        className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reminders */}
          {meetingType === 'scheduled' && (
            <div className="space-y-2">
              <Label className="font-medium">Reminders</Label>
              <div className="flex flex-wrap gap-2">
                {REMINDER_OPTIONS.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant={
                      reminders.includes(opt.value) ? 'default' : 'outline'
                    }
                    className="cursor-pointer transition-colors"
                    onClick={() =>
                      setReminders(
                        reminders.includes(opt.value)
                          ? reminders.filter((r) => r !== opt.value)
                          : [...reminders, opt.value],
                      )
                    }
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Related Entity */}
          {!initialEntityId && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-medium">Related To</Label>
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="contact">Contact</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="opportunity">Opportunity</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-medium">Entity</Label>
                <Select
                  value={entityId || undefined}
                  onValueChange={setEntityId}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityType === 'lead' &&
                      resolvedLeads.map((l: EntityRecord) => (
                        <SelectItem key={l.id} value={l.id}>
                          {[l.first_name, l.last_name]
                            .filter(Boolean)
                            .join(' ') ||
                            l.name ||
                            l.email ||
                            l.id}
                        </SelectItem>
                      ))}
                    {entityType === 'contact' &&
                      resolvedContacts.map((c: EntityRecord) => (
                        <SelectItem key={c.id} value={c.id}>
                          {[c.first_name, c.last_name]
                            .filter(Boolean)
                            .join(' ') ||
                            c.name ||
                            c.email ||
                            c.id}
                        </SelectItem>
                      ))}
                    {entityType === 'account' &&
                      resolvedAccounts.map((a: EntityRecord) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.account_name || a.name || a.id}
                        </SelectItem>
                      ))}
                    {entityType === 'opportunity' &&
                      resolvedOpportunities.map((o: EntityRecord) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.opportunity_name || o.title || o.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-background sticky bottom-0 flex items-center justify-between border-t px-6 py-4">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isBusy}
            className="min-w-[160px]"
          >
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isCreatingGoogleMeeting
              ? 'Creating Google Meeting...'
              : isCreatingZoomMeeting
                ? 'Creating Zoom Meeting...'
                : meetingType === 'logged'
                  ? 'Log Meeting'
                  : 'Create Meeting'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// EDIT MEETING DIALOG
// =============================================================================

export interface EditMeetingDialogProps {
  meeting: CoreMeeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  integrationAccounts?: IntegrationAccountRow[];
  onSuccess: () => void;
}

export function EditMeetingDialog({
  meeting,
  open,
  onOpenChange,
  workspaceId,
  integrationAccounts,
  onSuccess,
}: EditMeetingDialogProps) {
  const queryClient = useQueryClient();

  const { data: fetchedIntegrationAccounts = [] } = useQuery({
    queryKey: ['integration-accounts', workspaceId],
    queryFn: () => getIntegrationAccountsService(workspaceId),
    enabled: !!workspaceId && !integrationAccounts && open,
  });

  const resolvedIntegrationAccounts = integrationAccounts || fetchedIntegrationAccounts || [];

  const supabase = useSupabase();
  const { data: existingReminders = [] } = useQuery({
    queryKey: ['meeting-reminders', meeting?.id],
    queryFn: async () => {
      if (!meeting?.id) return [];
      const { data, error } = await supabase
        .schema('core')
        .from('meeting_reminders')
        .select('offset_minutes')
        .eq('meeting_id', meeting.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!meeting?.id && open,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledStart, setScheduledStart] = useState('');
  const [duration, setDuration] = useState(30);
  const [timezone, setTimezone] = useState('UTC');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<MeetingStatus>('scheduled');
  const [externalEmails, setExternalEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [reminders, setReminders] = useState<number[]>([30]);

  useEffect(() => {
    if (meeting && open) {
      setTitle(meeting.title || '');
      setDescription(meeting.description || '');
      const tz = meeting.timezone || 'UTC';
      setTimezone(tz);
      setScheduledStart(
        meeting.scheduled_start
          ? convertUTCToLocalTime(meeting.scheduled_start, tz)
          : '',
      );
      // Calculate duration from start and end times
      if (meeting.scheduled_start && meeting.scheduled_end) {
        const startMs = new Date(meeting.scheduled_start).getTime();
        const endMs = new Date(meeting.scheduled_end).getTime();
        const durationMins = Math.round((endMs - startMs) / 60000);
        setDuration(durationMins > 0 ? durationMins : 30);
      } else {
        setDuration(30);
      }
      setLocation(meeting.location || '');
      setStatus(meeting.status || 'scheduled');
      setSelectedAccountId(meeting.meeting_host_email_account_id || '');
      setExternalEmails(
        meeting.participants
          ?.filter((p) => p.external_email)
          .map((p) => p.external_email as string) ?? [],
      );
    }
  }, [meeting, open]);

  useEffect(() => {
    if (meeting && open) {
      if (existingReminders && existingReminders.length > 0) {
        const mapped = existingReminders.map((r: any) => r.offset_minutes);
        const isDiff =
          mapped.length !== reminders.length ||
          mapped.some((val, idx) => val !== reminders[idx]);
        if (isDiff) {
          setReminders(mapped);
        }
      } else {
        if (reminders.length !== 1 || reminders[0] !== 30) {
          setReminders([30]);
        }
      }
    }
  }, [meeting, open, existingReminders, reminders]);

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setScheduledStart('');
    setDuration(30);
    setTimezone('UTC');
    setLocation('');
    setStatus('scheduled');
    setExternalEmails([]);
    setNewEmail('');
    setSelectedAccountId('');
    setReminders([30]);
    onOpenChange(false);
  };
  const handleAddEmail = () => {
    if (
      newEmail &&
      newEmail.includes('@') &&
      !externalEmails.includes(newEmail)
    ) {
      setExternalEmails([...externalEmails, newEmail]);
      setNewEmail('');
    }
  };
  const handleRemoveEmail = (email: string) =>
    setExternalEmails(externalEmails.filter((e) => e !== email));

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!meeting) throw new Error('No meeting');
      const utcScheduledStart = scheduledStart
        ? convertLocalTimeToUTC(scheduledStart, timezone)
        : '';
      const utcScheduledEnd =
        scheduledStart && utcScheduledStart
          ? new Date(
              new Date(utcScheduledStart).getTime() + duration * 60000,
            ).toISOString()
          : undefined;

      return updateMeetingService({
        id: meeting.id,
        workspace_id: workspaceId,
        title: title.trim(),
        description: description || undefined,
        status,
        scheduled_start: utcScheduledStart || undefined,
        scheduled_end: utcScheduledEnd,
        timezone,
        location: location || undefined,
        participants: externalEmails.map((email) => ({
          participant_type: 'EXTERNAL' as const,
          external_email: email,
          display_name: email,
        })),
        attendees: externalEmails.map((email) => ({ email })),
        send_invites: true,
        reminders: reminders.map((offset) => ({
          offset_minutes: offset,
          channel: 'EMAIL' as const,
        })),
      });
    },
    onSuccess: (result) => {
      if (result?.zoom_warning) {
        toast.warning(
          result.message ||
            'Meeting updated locally, but Zoom sync failed. Please check your Zoom account.',
        );
      } else {
        toast.success('Meeting updated');
      }
      handleClose();
      queryClient.invalidateQueries({ queryKey: ['meetings', workspaceId] });
      onSuccess();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update meeting');
    },
  });

  if (!meeting) return null;
  const googleAccounts = resolvedIntegrationAccounts.filter(
    (acc: any) => acc.connection?.provider === 'GOOGLE',
  );
  const zoomAccounts = resolvedIntegrationAccounts.filter(
    (acc: any) => acc.connection?.provider === 'ZOOM',
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-y-auto p-0">
        <div className="bg-background sticky top-0 z-10 border-b px-6 py-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Edit Meeting
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label className="font-medium">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Meeting description"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label className="font-medium">Status</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_CONFIG) as MeetingStatus[]).map((s) => {
                const cfg = STATUS_CONFIG[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${status === s ? 'border-current shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700'}`}
                    style={
                      status === s
                        ? {
                            color: cfg.color,
                            borderColor: `${cfg.color}60`,
                            backgroundColor: `${cfg.color}10`,
                          }
                        : undefined
                    }
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-medium">Meeting Date & Time</Label>
              <DateTimePicker
                value={scheduledStart ? new Date(scheduledStart) : undefined}
                onChange={(date) => {
                  if (date) {
                    setScheduledStart(format(date, "yyyy-MM-dd'T'HH:mm"));
                  } else {
                    setScheduledStart('');
                  }
                }}
                minDate={new Date()}
                className="h-11 w-full"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Duration</Label>
              <Select
                value={String(duration)}
                onValueChange={(val) => setDuration(Number(val))}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="font-medium">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Location</Label>
              <div className="relative">
                <MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Physical location"
                  className="h-11 pl-10"
                />
              </div>
            </div>
          </div>
          {meeting.provider === 'GOOGLE' && googleAccounts.length > 0 && (
            <div className="space-y-2">
              <Label className="font-medium">Google Account</Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {googleAccounts.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.email || acc.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Changes will sync to Google Calendar
              </p>
            </div>
          )}
          {meeting.provider === 'ZOOM' && zoomAccounts.length > 0 && (
            <div className="space-y-2">
              <Label className="font-medium">Zoom Account</Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {zoomAccounts.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.email || acc.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Changes will sync to Zoom
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label className="font-medium">External Invitees</Label>
            <div className="flex gap-2">
              <Input
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                className="h-11"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEmail();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddEmail}
                className="h-11 w-11"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {externalEmails.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {externalEmails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    {email}
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-1 rounded-full hover:bg-gray-200"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Reminders */}
          <div className="space-y-2">
            <Label className="font-medium">Reminders</Label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((opt) => (
                <Badge
                  key={opt.value}
                  variant={
                    reminders.includes(opt.value) ? 'default' : 'outline'
                  }
                  className="cursor-pointer transition-colors"
                  onClick={() =>
                    setReminders(
                      reminders.includes(opt.value)
                        ? reminders.filter((r) => r !== opt.value)
                        : [...reminders, opt.value],
                    )
                  }
                >
                  {opt.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-background sticky bottom-0 flex items-center justify-between border-t px-6 py-4">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="min-w-[140px]"
          >
            {updateMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MEETING DETAILS DIALOG
// =============================================================================

export interface MeetingDetailsDialogProps {
  meeting: CoreMeeting | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onEdit: (meeting: CoreMeeting) => void;
  onDelete: (id: string) => void;
}

export function MeetingDetailsDialog({
  meeting,
  open,
  onOpenChange,
  workspaceId,
  onEdit,
  onDelete,
}: MeetingDetailsDialogProps) {
  const [newNote, setNewNote] = useState('');
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const { data: preferences } = useQuery({
    queryKey: ['workspace-preferences', workspaceId],
    queryFn: async () => {
      const { data } = await supabase
        .schema('core')
        .from('workspace_preferences')
        .select('timezone')
        .eq('workspace_id', workspaceId)
        .single();
      return { timezone: data?.timezone || 'UTC' };
    },
    enabled: !!workspaceId && open,
  });

  const userTz =
    preferences?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';
  const { data: notes = [] } = useQuery({
    queryKey: ['meeting-notes', meeting?.id],
    queryFn: () => {
      if (!meeting?.id) return [];
      return getMeetingNotesService(workspaceId, meeting.id);
    },
    enabled: !!meeting?.id && open,
  });
  const addNoteMutation = useMutation({
    mutationFn: () =>
      createMeetingNoteService({
        workspace_id: workspaceId,
        meeting_id: meeting!.id,
        content: newNote,
      }),
    onSuccess: () => {
      toast.success('Note added');
      setNewNote('');
      queryClient.invalidateQueries({
        queryKey: ['meeting-notes', meeting?.id],
      });
    },
    onError: () => toast.error('Failed to add note'),
  });

  if (!meeting) return null;
  const statusCfg = getStatusBadge(meeting.status);
  const providerBadge = getProviderBadge(meeting.provider);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-y-auto p-0">
        <div className="bg-background sticky top-0 z-10 flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <DialogTitle className="text-lg font-semibold">
              {meeting.title}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(meeting)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(meeting.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <Tabs defaultValue="overview" className="px-6">
          <TabsList className="mt-4 grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 pb-6">
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge
                variant="outline"
                className="gap-1"
                style={{
                  color: statusCfg.color,
                  borderColor: `${statusCfg.color}40`,
                  backgroundColor: `${statusCfg.color}10`,
                }}
              >
                {statusCfg.icon}
                {statusCfg.label}
              </Badge>
              <Badge variant="outline" className={`gap-1 ${providerBadge.cls}`}>
                {providerBadge.icon}
                {providerBadge.label}
              </Badge>
              <Badge variant="outline">
                {meeting.meeting_type === 'logged' ? 'Logged' : 'Scheduled'}
              </Badge>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <CalendarIcon className="text-muted-foreground mt-0.5 h-5 w-5" />
              <div>
                <p className="font-medium">
                  {formatMeetingTime(
                    meeting.meeting_type === 'logged'
                      ? meeting.actual_start
                      : meeting.scheduled_start,
                    meeting.meeting_type === 'logged'
                      ? meeting.actual_end
                      : meeting.scheduled_end,
                    meeting.timezone,
                    userTz,
                  )}
                </p>
                <p className="text-muted-foreground text-sm">
                  {meeting.timezone}
                </p>
              </div>
            </div>
            {meeting.description && (
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-500 uppercase">
                  Description
                </Label>
                <p className="text-sm">{meeting.description}</p>
              </div>
            )}
            {meeting.location && (
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <MapPin className="text-muted-foreground mt-0.5 h-5 w-5" />
                <p className="text-sm">{meeting.location}</p>
              </div>
            )}
            {meeting.meeting_url && (
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <ExternalLink className="text-muted-foreground mt-0.5 h-5 w-5" />
                <a
                  href={meeting.meeting_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                >
                  Join Meeting
                </a>
              </div>
            )}
            {meeting.host && (
              <div className="flex items-start gap-3 rounded-lg border p-3">
                <Users className="text-muted-foreground mt-0.5 h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Host</p>
                  <p className="text-muted-foreground text-sm">
                    {meeting.host.name || meeting.host.email}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="participants" className="space-y-3 pb-6">
            {meeting.participants && meeting.participants.length > 0 ? (
              <div className="space-y-2 pt-2">
                {meeting.participants.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="text-muted-foreground h-4 w-4" />
                      <span className="text-sm">
                        {p.display_name ||
                          p.external_email ||
                          p.internal_user?.name}
                      </span>
                      {p.is_host && (
                        <Badge variant="outline" className="text-xs">
                          Host
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {p.response_status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground pt-4 text-center text-sm">
                No participants added
              </p>
            )}
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 pb-6">
            <div className="space-y-2 pt-2">
              <Label className="font-medium">Add Note</Label>
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a note..."
                rows={3}
              />
              <Button
                size="sm"
                onClick={() => addNoteMutation.mutate()}
                disabled={!newNote.trim() || addNoteMutation.isPending}
              >
                {addNoteMutation.isPending && (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                )}
                Add Note
              </Button>
            </div>
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note: EntityRecord) => (
                  <div key={note.id} className="rounded-lg border p-3">
                    <p className="text-sm whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center text-sm">
                No notes yet
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function MeetingsPage() {
  const [addColumnModalOpen, setAddColumnModalOpen] = useState(false);
  const { currentWorkspace: workspace, user } = useRBAC();
  const queryClient = useQueryClient();
  const supabase = useSupabase();

  const { data: preferences } = useQuery({
    queryKey: ['workspace-preferences', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return { timezone: 'UTC' };
      const { data } = await supabase
        .schema('core')
        .from('workspace_preferences')
        .select('timezone')
        .eq('workspace_id', workspace.id)
        .single();
      return { timezone: data?.timezone || 'UTC' };
    },
    enabled: !!workspace?.id,
  });

  const userTz =
    preferences?.timezone ||
    Intl.DateTimeFormat().resolvedOptions().timeZone ||
    'UTC';

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string[]>([
    'upcoming',
  ]);
  const [selectedCreatedByIds, setSelectedCreatedByIds] = useState<string[]>(
    [],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [viewFilter, setViewFilter] = useState<'my' | 'team'>('my');
  const {
    dateRange: createdOnRange,
    setDateRange: setCreatedOnRange,
    computedDates: computedCreatedOnDates,
    clearDateRange: clearCreatedOnRange,
  } = useDateRangeFilter();
  const {
    dateRange: updatedOnRange,
    setDateRange: setUpdatedOnRange,
    computedDates: computedUpdatedOnDates,
    clearDateRange: clearUpdatedOnRange,
  } = useDateRangeFilter('updated');

  const isAdmin = useMemo(() => {
    if (!workspace) return false;
    return (
      workspace.owner_id === user?.id ||
      workspace.currentRole?.role_key === 'admin' ||
      (workspace.currentRole?.hierarchy_level ?? 0) >= 100
    );
  }, [workspace, user]);

  const getCategoryBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'lead':
        return (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-600"
          >
            Lead
          </Badge>
        );
      case 'contact':
        return (
          <Badge
            variant="outline"
            className="border-emerald-200 bg-emerald-50 text-emerald-600"
          >
            Contact
          </Badge>
        );
      case 'opportunity':
        return (
          <Badge
            variant="outline"
            className="border-purple-200 bg-purple-50 text-purple-600"
          >
            Opportunity
          </Badge>
        );
      case 'account':
        return (
          <Badge
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-600"
          >
            Account
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type || 'General'}</Badge>;
    }
  };

  const columns = useMemo(
    () => [
      { id: 'sno', label: 'S. No.' },
      { id: 'title', label: 'Title' },
      { id: 'type', label: 'Type' },
      { id: 'provider', label: 'Provider' },
      { id: 'date_time', label: 'Date & Time' },
      { id: 'status', label: 'Status' },
      { id: 'category', label: 'Entity' },
      { id: 'associate', label: 'Associate With' },
    ],
    [],
  );

  const { visibility, toggleVisibility, isVisible, reset } =
    useColumnVisibility('meetings', {
      sno: true,
      title: true,
      type: true,
      provider: true,
      date_time: true,
      status: true,
      category: true,
      associate: true,
    });

  const { getHeaderProps, getResizeHandleProps } = useColumnResize('meetings');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [initialMeetingType, setInitialMeetingType] =
    useState<MeetingType>('scheduled');
  const [selectedMeeting, setSelectedMeeting] = useState<CoreMeeting | null>(
    null,
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<CoreMeeting | null>(
    null,
  );
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch team members (for Created By filter dropdown)
  const { members } = usePackageMembers();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: [
      'meetings',
      workspace?.id,
      viewFilter,
      debouncedSearchTerm,
      selectedStatuses,
      selectedTimeframe,
      selectedCreatedByIds,
      computedCreatedOnDates,
      computedUpdatedOnDates,
    ],
    queryFn: () => {
      if (!workspace?.id) return [];
      // Include meetings where current user is a participant or host
      return getMeetingsService(
        workspace.id,
        undefined,
        undefined,
        undefined,
        true,
        undefined,
        viewFilter,
        {
          createdAtFrom: computedCreatedOnDates?.from ?? undefined,
          createdAtTo: computedCreatedOnDates?.to ?? undefined,
          updatedAtFrom: computedUpdatedOnDates?.from ?? undefined,
          updatedAtTo: computedUpdatedOnDates?.to ?? undefined,
          createdByIds: selectedCreatedByIds.length > 0 ? selectedCreatedByIds : undefined,
          statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
          timeframe: selectedTimeframe.length > 0 ? selectedTimeframe : undefined,
          searchTerm: debouncedSearchTerm || undefined,
        },
      );
    },
    enabled: !!workspace?.id,
  });

  const meetingViewStatuses = useMemo(
    () => [
      { id: 'team', status_name: "Team Members' Meetings", color: '#3b82f6' },
    ],
    [],
  );

  const meetingViewBreakdown = useMemo(() => {
    return {
      team: { count: viewFilter === 'team' ? meetings.length : 0 },
    };
  }, [meetings, viewFilter]);

  const { data: integrationAccounts = [] } = useQuery({
    queryKey: ['integration-accounts', workspace?.id],
    queryFn: () => {
      if (!workspace?.id) return [];
      return getIntegrationAccountsService(workspace.id);
    },
    enabled: !!workspace?.id,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const res = await getLeadsService({ workspaceId: workspace.id });
      return res?.data ?? [];
    },
    enabled: !!workspace?.id,
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const res = await getContactsService({ workspaceId: workspace.id });
      return res?.data ?? [];
    },
    enabled: !!workspace?.id,
  });
  const { data: crmAccounts = [] } = useQuery({
    queryKey: ['crm-accounts', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const res = await getAccountsService({ workspaceId: workspace.id });
      return res?.data ?? [];
    },
    enabled: !!workspace?.id,
  });
  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities', workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      const res = await getOpportunitiesService({ workspaceId: workspace.id });
      return res?.data ?? [];
    },
    enabled: !!workspace?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMeetingService(workspace!.id, id),
    onSuccess: () => {
      toast.success('Meeting deleted');
      setIsDetailsOpen(false);
      setSelectedMeeting(null);
      queryClient.invalidateQueries({ queryKey: ['meetings', workspace?.id] });
    },
    onError: () => toast.error('Failed to delete meeting'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelMeetingService(workspace!.id, id),
    onSuccess: () => {
      toast.success('Meeting cancelled');
      queryClient.invalidateQueries({ queryKey: ['meetings', workspace?.id] });
    },
    onError: () => toast.error('Failed to cancel meeting'),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedStatuses,
    selectedTimeframe,
    selectedCreatedByIds,
    pageSize,
    createdOnRange,
    updatedOnRange,
  ]);

  const filteredMeetings = useMemo(() => {
    return meetings;
  }, [meetings]);

  const { sortColumn, sortDirection, toggleSort, sortedData } =
    useTableSort<CoreMeeting>('meetings', filteredMeetings, {
      onSortChange: () => setCurrentPage(1),
    });

  const paginatedMeetings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredMeetings.length / pageSize);
  const totalCount = filteredMeetings.length;

  const statusBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    meetings.forEach((m: CoreMeeting) => {
      breakdown[m.status] = (breakdown[m.status] || 0) + 1;
    });
    return breakdown;
  }, [meetings]);

  return (
    <>
      <div className="flex w-full max-w-full min-w-0 shrink-0 flex-col gap-2 overflow-hidden border-b">
        <PageHeader
          title={`Meetings (${totalCount})`}          
        >
          <div className="p-[2px]">
            <ListToolBar
              align="right"
              className="border-none bg-transparent p-0"
              showSearch
              expandableSearch
              searchPlaceholder="Search meetings..."
              searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          showFilter
          filterGroups={[
            {
              key: 'status',
              label: 'Status',
              selectedValues: selectedStatuses,
              selectedLabel:
                selectedStatuses.length === 0
                  ? 'All statuses'
                  : `${selectedStatuses.length} selected`,
              options: meetingStatuses.map((s) => ({
                value: s.id,
                label: s.status_name,
                color: s.color,
              })),
              onSelectValues: setSelectedStatuses,
            },
            {
              key: 'created_by',
              label: 'Created By',
              selectedValues: selectedCreatedByIds,
              selectedLabel:
                selectedCreatedByIds.length === 0
                  ? 'All members'
                  : selectedCreatedByIds.length === 1
                    ? ((
                        (Array.isArray(members) ? members : []).find(
                          (m: any) => m?.user_id === selectedCreatedByIds[0],
                        ) as any
                      )?.user?.user_metadata?.full_name ?? '1 selected')
                    : `${selectedCreatedByIds.length} selected`,
              options: (Array.isArray(members) ? members : [])
                .filter((m: any) => m?.user_id)
                .reduce((acc: any[], m: any) => {
                  if (!acc.some((x) => x.value === m.user_id)) {
                    acc.push({
                      value: m.user_id,
                      label:
                        m.user?.user_metadata?.full_name ||
                        m.user?.email ||
                        m.user_id,
                    });
                  }
                  return acc;
                }, []),
              onSelectValues: setSelectedCreatedByIds,
            },
            {
              key: 'timeframe',
              label: 'Timeframe',
              selectedValues: selectedTimeframe,
              selectedLabel:
                selectedTimeframe.length === 0
                  ? 'All meetings'
                  : selectedTimeframe.length === 1
                    ? selectedTimeframe[0] === 'upcoming'
                      ? 'Upcoming'
                      : 'Past'
                    : `${selectedTimeframe.length} selected`,
              options: [
                { value: 'upcoming', label: 'Upcoming' },
                { value: 'past', label: 'Past' },
              ],
              onSelectValues: setSelectedTimeframe,
            },
            {
              key: 'created_on',
              label: 'Created On',
              type: 'date',
              dateValue: createdOnRange,
              onDateChange: (val) => {
                setCreatedOnRange(val);
                setCurrentPage(1);
              },
            },
            {
              key: 'updated_on',
              label: 'Updated On',
              type: 'date',
              dateValue: updatedOnRange,
              onDateChange: (val) => {
                setUpdatedOnRange(val);
                setCurrentPage(1);
              },
            },
          ]}
          activeFilterCount={
            selectedStatuses.length +
            (selectedCreatedByIds.length > 0 ? 1 : 0) +
            (selectedTimeframe.includes('upcoming') &&
            selectedTimeframe.length === 1
              ? 0
              : selectedTimeframe.length) +
            (createdOnRange ? 1 : 0) +
            (updatedOnRange ? 1 : 0)
          }
          onClearFilters={() => {
            setSelectedStatuses([]);
            setSelectedCreatedByIds([]);
            setSelectedTimeframe(['upcoming']);
            clearCreatedOnRange();
            clearUpdatedOnRange();
          }}
          actions={[
            {
              key: 'manage-accounts',
              label: 'Manage Accounts',
              icon: Settings,
              onClick: () => {
                window.location.href =
                  '/home/sales/workspace-settings#meetings';
              },
              buttonVariant: 'outline' as const,
            },
            {
              key: 'schedule-meeting',
              label: 'Schedule Meeting',
              icon: Plus,
              onClick: () => {
                setInitialMeetingType('scheduled');
                setIsCreateDialogOpen(true);
              },
              buttonVariant: 'default' as const,
            },
          ]}
          columnVisibilitySlot={
            <ColumnVisibilitySelector
              columns={columns}
              visibility={visibility}
              onToggle={toggleVisibility}
              onReset={reset}
            />
          }
        />
          </div>
        </PageHeader>
      </div>

      <PageBody className="sticky flex min-h-0 w-full max-w-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 w-full max-w-full min-w-0 flex-1 gap-0">
          <CustomTableContainer
            pagination={
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(val) => {
                  setPageSize(val);
                  setCurrentPage(1);
                }}
                entityLabel="meetings"
              />
            }
          >
            <Table>
              <TableHeader>
                <TableRow>
                  {isVisible('sno') && (
                    <SortableTableHead
                      label="S. No."
                      columnId="sno"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      sortable={false}
                      className="relative w-12 whitespace-nowrap"
                      {...getHeaderProps('sno')}
                    >
                      <span
                        className="col-resize-handle"
                        data-min-width={30}
                        {...getResizeHandleProps('sno')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('title') && (
                    <SortableTableHead
                      label="Title"
                      columnId="title"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('title')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('title')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('type') && (
                    <SortableTableHead
                      label="Type"
                      columnId="type"
                      sortKey="meeting_type"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('type')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('type')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('provider') && (
                    <SortableTableHead
                      label="Provider"
                      columnId="provider"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('provider')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('provider')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('date_time') && (
                    <SortableTableHead
                      label="Date & Time"
                      columnId="date_time"
                      sortKey="scheduled_start"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('date_time')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('date_time')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('status') && (
                    <SortableTableHead
                      label="Status"
                      columnId="status"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('status')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('status')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('category') && (
                    <SortableTableHead
                      label="Entity"
                      columnId="category"
                      sortKey="entity_type"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('category')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('category')}
                      />
                    </SortableTableHead>
                  )}
                  {isVisible('associate') && (
                    <SortableTableHead
                      label="Associate With"
                      columnId="associate"
                      sortKey="entity_name"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={toggleSort}
                      className="relative"
                      {...getHeaderProps('associate')}
                    >
                      <span
                        className="col-resize-handle"
                        {...getResizeHandleProps('associate')}
                      />
                    </SortableTableHead>
                  )}
                  <TableHead className="sticky-right-header bg-background z-10 w-12 px-1 text-center">
                    <Button
                      variant="outline"
                      size="icon"
                      className="mx-auto flex h-8 w-8 items-center justify-center border-dashed"
                      onClick={() => setAddColumnModalOpen(true)}
                      title="Toggle Columns"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <MeetingsPageSkeleton colSpan={12} />
                ) : paginatedMeetings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={12}
                      className="h-32 text-center"
                    >
                      <p className="text-muted-foreground">
                        {searchTerm
                          ? 'No meetings match your search'
                          : 'No meetings found'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMeetings.map(
                    (meeting: CoreMeeting, index: number) => {
                      const statusCfg = getStatusBadge(meeting.status);
                      const providerInfo = getProviderBadge(meeting.provider);
                      const sno = (currentPage - 1) * pageSize + index + 1;
                      return (
                        <TableRow
                          key={meeting.id}
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => {
                            setSelectedMeeting(meeting);
                            setIsDetailsOpen(true);
                          }}
                        >
                          {isVisible('sno') && (
                            <TableCell className="text-muted-foreground px-4 py-2">
                              {sno}
                            </TableCell>
                          )}
                          {isVisible('title') && (
                            <TableCell className="px-4 py-2">
                              <div>
                                <p className="text-sm font-medium">
                                  {meeting.title}
                                </p>
                                {meeting.location && (
                                  <p className="text-muted-foreground mt-0.5 text-xs">
                                    {meeting.location}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                          )}
                          {isVisible('type') && (
                            <TableCell className="px-4 py-2">
                              <Badge
                                variant="outline"
                                className="h-5 py-0 text-xs"
                              >
                                {meeting.meeting_type === 'logged'
                                  ? 'Logged'
                                  : 'Scheduled'}
                              </Badge>
                            </TableCell>
                          )}
                          {isVisible('provider') && (
                            <TableCell className="px-4 py-2">
                              <Badge
                                variant="outline"
                                className={`h-5 gap-1.5 py-0 text-xs ${providerInfo.cls}`}
                              >
                                {providerInfo.icon}
                                {providerInfo.label}
                              </Badge>
                            </TableCell>
                          )}
                          {isVisible('date_time') && (
                            <TableCell className="px-4 py-2">
                              <div className="flex items-center gap-2 text-xs">
                                <Clock className="text-muted-foreground h-3.5 w-3.5" />
                                {formatMeetingTime(
                                  meeting.meeting_type === 'logged'
                                    ? meeting.actual_start
                                    : meeting.scheduled_start,
                                  meeting.meeting_type === 'logged'
                                    ? meeting.actual_end
                                    : meeting.scheduled_end,
                                  meeting.timezone,
                                  userTz,
                                )}
                              </div>
                            </TableCell>
                          )}
                          {isVisible('status') && (
                            <TableCell className="px-4 py-2">
                              <Badge
                                variant="outline"
                                className="h-5 gap-1.5 py-0 text-xs"
                                style={{
                                  color: statusCfg.color,
                                  borderColor: `${statusCfg.color}40`,
                                  backgroundColor: `${statusCfg.color}10`,
                                }}
                              >
                                {statusCfg.icon}
                                {statusCfg.label}
                              </Badge>
                            </TableCell>
                          )}
                          {isVisible('category') && (
                            <TableCell className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                              {getCategoryBadge(meeting.entity_type)}
                            </TableCell>
                          )}
                          {isVisible('associate') && (
                            <TableCell className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                              {meeting.entity_name && (
                                <Link
                                  href={`/home/sales/${meeting.entity_type === 'opportunity' ? 'opportunities' : `${meeting.entity_type}s`}/${meeting.entity_id}`}
                                  className="primary-text-medium text-leadgaze-primary dark:text-leadgaze-primary text-xs font-medium hover:underline"
                                  title={`${meeting.entity_type}: ${meeting.entity_name}`}
                                >
                                  {meeting.entity_name}
                                </Link>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="bg-card sticky right-0 px-4 py-2 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                asChild
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedMeeting(meeting);
                                    setIsDetailsOpen(true);
                                  }}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingMeeting(meeting);
                                    setIsEditOpen(true);
                                  }}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {meeting.meeting_url &&
                                  meeting.status === 'scheduled' && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        window.open(
                                          meeting.meeting_url as string,
                                          '_blank',
                                        );
                                      }}
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      Join Meeting
                                    </DropdownMenuItem>
                                  )}
                                {meeting.status === 'scheduled' && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      cancelMutation.mutate(meeting.id)
                                    }
                                  >
                                    <Ban className="mr-2 h-4 w-4" />
                                    Cancel Meeting
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    if (confirm('Are you sure?'))
                                      deleteMutation.mutate(meeting.id);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    },
                  )
                )}
              </TableBody>
            </Table>
          </CustomTableContainer>
        </div>

        {/* Dialogs */}
        {workspace?.id && (
          <CreateMeetingDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            workspaceId={workspace.id}
            integrationAccounts={integrationAccounts}
            leads={leads}
            contacts={contacts}
            accounts={crmAccounts}
            opportunities={opportunities}
            initialType={initialMeetingType}
            onSuccess={() =>
              queryClient.invalidateQueries({
                queryKey: ['meetings', workspace?.id],
              })
            }
          />
        )}

        <MeetingDetailsDialog
          meeting={selectedMeeting}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          workspaceId={workspace?.id || ''}
          onEdit={(m) => {
            setEditingMeeting(m);
            setIsEditOpen(true);
          }}
          onDelete={(id) => {
            if (confirm('Are you sure?')) deleteMutation.mutate(id);
          }}
        />

        {isEditOpen && editingMeeting && (
          <EditMeetingDialog
            meeting={editingMeeting}
            open={isEditOpen}
            onOpenChange={(open) => {
              setIsEditOpen(open);
              if (!open) setEditingMeeting(null);
            }}
            workspaceId={workspace?.id || ''}
            integrationAccounts={integrationAccounts}
            onSuccess={() =>
              queryClient.invalidateQueries({
                queryKey: ['meetings', workspace?.id],
              })
            }
          />
        )}
      
      <AddColumnModal
        open={addColumnModalOpen}
        onOpenChange={setAddColumnModalOpen}
        columns={columns}
        visibility={visibility}
        onToggleColumn={toggleVisibility}
        onResetColumns={reset}
      />
      </PageBody>
    </>
  );
}
