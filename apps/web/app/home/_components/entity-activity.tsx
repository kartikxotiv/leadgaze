'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  Clock,
  Download,
  ExternalLink,
  File,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

// Alias Calendar to CalendarIcon for consistent naming
const CalendarIcon = Calendar;
import { toast } from 'sonner';
import { DateTimePicker } from '@kit/ui/datetime-picker';
import { format } from 'date-fns';

import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { Badge } from '@kit/ui/badge';
import { Textarea } from '@kit/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { CustomDeleteDialog } from '@kit/ui/custom-delete-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';

import { useLocalization } from '~/lib/localization/localization-provider';
import { useHasPermission } from '~/lib/permissions/use-permissions';
import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { useRBAC } from '~/lib/rbac/rbac-provider';

import {
  createDocumentService,
  createReminderService,
  deleteDocumentService,
  deleteReminderService,
  getDocumentsService,
  getRemindersService,
  updateDocumentService,
  updateReminderService,
} from '../../../services/activities.service';

import {
  type CoreMeeting,
  type MeetingProvider,
  type MeetingStatus,
  type MeetingType,
  createMeetingService as createCoreMeetingService,
  deleteMeetingService as deleteCoreMeetingService,
  getMeetingsService as getCoreMeetingsService,
  updateMeetingService as updateCoreMeetingService,
} from '@kit/core/services';
import {
  CreateMeetingDialog,
  EditMeetingDialog,
  MeetingDetailsDialog,
} from '~/home/meetings/page';

interface EntityActivityProps {
  entityType: string;
  entityId: string;
}

// --- Reminders ---

const getPriorityBadge = (priority: string) => {
  switch (priority?.toLowerCase()) {
    case 'high':
      return (
        <Badge
          variant="outline"
          className="border-red-200 bg-red-50 text-red-600"
        >
          High
        </Badge>
      );
    case 'medium':
      return (
        <Badge
          variant="outline"
          className="border-amber-200 bg-amber-50 text-amber-600"
        >
          Medium
        </Badge>
      );
    case 'low':
      return (
        <Badge
          variant="outline"
          className="border-emerald-200 bg-emerald-50 text-emerald-600"
        >
          Low
        </Badge>
      );
    default:
      return <Badge variant="secondary">{priority || 'Medium'}</Badge>;
  }
};

export function EntityReminders({ entityType, entityId }: EntityActivityProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { formatDate } = useLocalization();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [reminderTab, setReminderTab] = useState<'active' | 'sent'>('active');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'medium',
  });
  const [editingReminder, setEditingReminder] = useState<any>(null);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', entityType, entityId, workspace?.id, reminderTab],
    queryFn: () => {
      if (!workspace?.id) return [];
      // 'active' tab → fetch only non-completed; 'sent' tab → fetch only completed
      const apiStatus = reminderTab === 'sent' ? 'completed' : 'active';
      return getRemindersService(workspace.id, entityType, entityId, apiStatus);
    },
    enabled: !!workspace?.id,
  });

  // Split into active / sent views; limit sent to last 5 sorted by completion date
  const displayedReminders = reminderTab === 'sent'
    ? reminders
        .filter((r: any) => r.is_completed)
        .sort((a: any, b: any) =>
          new Date(b.completed_at || b.updated_at).getTime() -
          new Date(a.completed_at || a.updated_at).getTime(),
        )
        .slice(0, 5)
    : reminders.filter((r: any) => !r.is_completed);

  const createMutation = useMutation({
    mutationFn: () =>
      createReminderService({
        workspace_id: workspace!.id,
        entity_type: entityType,
        entity_id: entityId,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        due_date: formData.due_date
          ? new Date(formData.due_date).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast.success('Reminder set');
      setIsOpen(false);
      setFormData({ title: '', description: '', due_date: '', priority: 'medium' });
      queryClient.invalidateQueries({
        queryKey: ['reminders', entityType, entityId, workspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['reminders'],
      });
    },
    onError: () => toast.error('Failed to set reminder'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) =>
      updateReminderService(editingReminder.id, payload),
    onSuccess: () => {
      toast.success('Reminder updated');
      setIsOpen(false);
      setEditingReminder(null);
      setFormData({ title: '', description: '', due_date: '', priority: 'medium' });
      queryClient.invalidateQueries({
        queryKey: ['reminders', entityType, entityId, workspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['reminders'],
      });
    },
    onError: () => toast.error('Failed to update reminder'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteReminderService,
    onSuccess: () => {
      toast.success('Reminder deleted');
      setIsDeleteDialogOpen(false);
      setReminderToDelete(null);
      queryClient.invalidateQueries({
        queryKey: ['reminders', entityType, entityId, workspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['reminders'],
      });
    },
    onError: () => {
      toast.error('Failed to delete reminder');
      setIsDeleteDialogOpen(false);
      setReminderToDelete(null);
    },
  });

  const handleSave = () => {
    const payload = {
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      due_date: formData.due_date
        ? new Date(formData.due_date).toISOString()
        : undefined,
    };
    if (editingReminder) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate();
    }
  };

  const openEditDialog = (reminder: any) => {
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      description: reminder.description || '',
      due_date: reminder.due_date
        ? new Date(reminder.due_date).toISOString().slice(0, 16)
        : '',
      priority: reminder.priority || 'medium',
    });
    setIsOpen(true);
  };

  const toggleCompletion = (reminder: any) => {
    setEditingReminder(reminder);
    updateReminderService(reminder.id, {
      is_completed: !reminder.is_completed,
    }).then(() => {
      queryClient.invalidateQueries({
        queryKey: ['reminders', entityType, entityId],
      });
      queryClient.invalidateQueries({
        queryKey: ['reminders'],
      });
      toast.success(
        reminder.is_completed
          ? 'Reminder marked as pending'
          : 'Reminder marked as completed',
      );
    });
  };

  return (
    <CardWidgetContainer
      title="Reminders"
      headerClassName="p-2 xl:p-2 2xl:p-2 mb-1"
      icon={<AlertCircle className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      icon2={
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingReminder(null);
              setFormData({ title: '', description: '', due_date: '', priority: 'medium' });
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="gap-1 text-sm text-blue-500 hover:text-blue-600">
              <Plus className="h-4 w-4" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {editingReminder ? 'Edit Reminder' : 'Set Reminder'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 space-y-2 px-2">
              <div>
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Call client..."
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Add more details..."
                />
              </div>
              <div>
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(val) =>
                    setFormData({ ...formData, priority: val })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Due Date</Label>
                <DateTimePicker
                  showTime
                  value={formData.due_date ? new Date(formData.due_date) : undefined}
                  onChange={(date) =>
                    setFormData({ ...formData, due_date: date ? format(date, "yyyy-MM-dd'T'HH:mm") : '' })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  !formData.title ||
                  !formData.due_date ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingReminder
                    ? 'Update Reminder'
                    : 'Set Reminder'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="px-2 mb-2">
        {/* Active / Sent toggle (mirrors Notes pattern) */}
        <div className="flex bg-gray-100/60 dark:bg-gray-800/60 p-0.5 rounded-lg mb-2 w-fit border border-gray-200/20">
          <button
            onClick={() => setReminderTab('active')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
              reminderTab === 'active'
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setReminderTab('sent')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
              reminderTab === 'sent'
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Completed
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : displayedReminders.length > 0 ? (
          <CardWidgetList>
            {displayedReminders.map((reminder: any) => (
              <CardWidgetListItem
                key={reminder.id}
                icon={
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className={`h-2 w-2 cursor-pointer rounded-full transition-transform hover:scale-125 ${reminder.is_completed ? 'bg-green-500' : 'bg-amber-500'}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCompletion(reminder);
                          }}
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{reminder.is_completed ? 'Mark as pending' : 'Mark as completed'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                }
                iconAlignTop={true}
                title={
                  <span
                    onClick={() => openEditDialog(reminder)}
                    className={`text-sm font-medium ${reminder.is_completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}
                  >
                    {reminder.title}
                  </span>
                }
                badge={getPriorityBadge(reminder.priority)}
                metadata={
                  <div className="flex flex-col gap-1">
                    {reminder.description && (
                      <p
                        className="text-xs text-gray-500 max-w-[280px] truncate"
                        title={reminder.description}
                      >
                        {reminder.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1">
                      {reminder.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                           Due: {formatDate(reminder.due_date)} {new Date(reminder.due_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                      <span>
                        Created by {reminder.created_by_user?.name || reminder.created_by_name || reminder.created_by_user?.email || 'Unknown'} on {formatDate(reminder.created_at)}
                      </span>
                      {reminder.entity_type !== entityType && (
                        <span className="text-blue-600 dark:text-blue-400">
                          From {reminder.entity_type.charAt(0).toUpperCase() + reminder.entity_type.slice(1)}{reminder.entity_name ? `: ${reminder.entity_name}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                }
                actions={
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(reminder)}
                      className="h-7 w-7 text-gray-400 hover:text-blue-500"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setReminderToDelete(reminder.id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                }
              />
            ))}
          </CardWidgetList>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
              <AlertCircle className="h-6 w-6 text-blue-500" />
            </div>
            <p className="mt-4 text-sm text-gray-500">No reminders</p>
          </div>
        )}
      </div>
      <CustomDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Reminder"
        description="Are you sure you want to delete this reminder? This action cannot be undone."
        onConfirm={() => {
          if (reminderToDelete) {
            deleteMutation.mutate(reminderToDelete);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </CardWidgetContainer>
  );
}

// --- Meetings ---

export function EntityMeetings({ entityType, entityId }: EntityActivityProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { formatDate } = useLocalization();
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

  const userTz = preferences?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const moduleKey = useMemo(() => {
    const mapping: Record<string, string> = {
      lead: 'leads',
      contact: 'contacts',
      account: 'accounts',
      opportunity: 'opportunities',
    };
    return mapping[entityType] || entityType;
  }, [entityType]);

  const canScheduleMeeting = useHasPermission(moduleKey, 'schedule_meeting');
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<CoreMeeting | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);

  // Fetch meetings - include meetings where user is a participant
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings', entityType, entityId, workspace?.id],
    queryFn: async () => {
      if (!workspace?.id) return [];
      // Always include meetings where current user is a participant/host
      return getCoreMeetingsService(workspace.id, entityType, entityId, undefined, true);
    },
    enabled: !!workspace?.id,
  });

  const filteredMeetings = useMemo(() => {
    const now = new Date();
    return meetings.filter((meeting: any) => {
      const start = meeting.scheduled_start || meeting.start_time || meeting.actual_start;
      if (!start) return activeTab === 'upcoming';
      const isUpcoming = new Date(start) >= now && meeting.status !== 'completed' && meeting.status !== 'cancelled';
      return activeTab === 'upcoming' ? isUpcoming : !isUpcoming;
    });
  }, [meetings, activeTab]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteCoreMeetingService(workspace!.id, id);
    },
    onSuccess: () => {
      toast.success('Meeting deleted');
      setIsDetailsOpen(false);
      setSelectedMeeting(null);
      setIsDeleteDialogOpen(false);
      setMeetingToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
    onError: () => {
      toast.error('Failed to delete meeting');
      setIsDeleteDialogOpen(false);
      setMeetingToDelete(null);
    },
  });

  const formatMeetingDate = (meeting: CoreMeeting) => {
    const tz = userTz || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const originalTz = meeting.timezone || 'UTC';
    const start = meeting.meeting_type === 'logged' ? meeting.actual_start : meeting.scheduled_start;
    const end = meeting.meeting_type === 'logged' ? meeting.actual_end : meeting.scheduled_end;

    if (!start) return 'No time set';
    
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

    // If original meeting timezone is different from user timezone, append the original time in brackets
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
  };

  const getMeetingLink = (meeting: CoreMeeting) => {
    if (meeting.meeting_url) {
      return (
        <a
          href={meeting.meeting_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-600 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
          Join
        </a>
      );
    }
    return null;
  };

  // Helper to get status badge
  const getStatusBadge = (status: MeetingStatus) => {
    const config: Record<MeetingStatus, { label: string; color: string }> = {
      scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
      in_progress: { label: 'In Progress', color: 'bg-amber-100 text-amber-700' },
      completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
    };
    const cfg = config[status] || config.scheduled;
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
        {cfg.label}
      </span>
    );
  };

  // Helper to get provider badge
  const getProviderBadge = (meeting: CoreMeeting) => {
    if (meeting.provider === 'GOOGLE') {
      return <span className="text-xs text-blue-600">Google Meet</span>;
    }
    if (meeting.provider === 'ZOOM') {
      return <span className="text-xs text-blue-600">Zoom</span>;
    }
    return null;
  };

  const renderMeetingsList = (items: CoreMeeting[]) => {
    if (items.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
            <Calendar className="h-6 w-6 text-blue-500" />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            {activeTab === 'upcoming' ? 'No upcoming meetings' : 'No previous meetings'}
          </p>
        </div>
      );
    }
    return (
      <div className="max-h-[280px] overflow-y-auto mb-2 pr-1">
        <CardWidgetList>
          {items.map((meeting: CoreMeeting) => (
          <CardWidgetListItem
            key={meeting.id}
            title={
              <div className="flex items-center gap-2">
                <span
                  className="primary-text-medium text-leadgaze-dark dark:text-white cursor-pointer hover:text-blue-600"
                  onClick={() => {
                    setSelectedMeeting(meeting);
                    setIsDetailsOpen(true);
                  }}
                >
                  {meeting.title}
                </span>
                {getStatusBadge(meeting.status)}
              </div>
            }
            content={
              <div className="mt-0 flex items-center gap-2 text-xs text-gray-500">
                {getProviderBadge(meeting)}
                {meeting.location && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {meeting.location}
                    </span>
                  </>
                )}
              </div>
            }
            metadata={
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {formatMeetingDate(meeting)}
                </span>
                {meeting.host && (
                  <span>
                    Created by {meeting.host.name || meeting.host.email || 'Unknown'} on {formatDate(meeting.created_at)}
                  </span>
                )}
                {!meeting.host && (
                  <span>Created on {formatDate(meeting.created_at)}</span>
                )}
                {meeting.entity_type && meeting.entity_type !== entityType && (
                  <span className="text-blue-600 dark:text-blue-400">
                    From {meeting.entity_type.charAt(0).toUpperCase() + meeting.entity_type.slice(1)}
                    {meeting.entity_id ? `: ${meeting.entity_id}` : ''}
                  </span>
                )}
              </div>
            }
            actions={
              <div className="flex items-center gap-1">
                {getMeetingLink(meeting)}
                {canScheduleMeeting && (
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setSelectedMeeting(meeting);
                        setIsEditOpen(true);
                      }}
                      className="h-7 w-7 text-gray-400 hover:text-blue-500"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setMeetingToDelete(meeting.id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            }
          />
        ))}
      </CardWidgetList>
      </div>
    );
  };

  return (
    <CardWidgetContainer
      title="Meetings"
      headerClassName="p-2 xl:p-2 2xl:p-2 mb-1"
      icon={<Calendar className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      icon2={
        canScheduleMeeting && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-1 text-sm text-blue-500 hover:text-blue-600"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Schedule
          </Button>
        )
      }
    >
      <div className="px-2 mb-2">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming" className="h-8" >Upcoming</TabsTrigger>
              <TabsTrigger value="past" className="h-8" >Previous</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              {renderMeetingsList(filteredMeetings)}
            </TabsContent>
            <TabsContent value="past">
              {renderMeetingsList(filteredMeetings)}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {isCreateOpen && (
        <CreateMeetingDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          workspaceId={workspace!.id}
          initialEntityType={entityType}
          initialEntityId={entityId}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['meetings'] })}
        />
      )}
      {isEditOpen && (
        <EditMeetingDialog
          meeting={selectedMeeting}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          workspaceId={workspace!.id}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['meetings'] })}
        />
      )}
      {isDetailsOpen && (
        <MeetingDetailsDialog
          meeting={selectedMeeting}
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          workspaceId={workspace!.id}
          onEdit={(m) => {
            setSelectedMeeting(m);
            setIsDetailsOpen(false);
            setIsEditOpen(true);
          }}
          onDelete={(id) => {
            setMeetingToDelete(id);
            setIsDeleteDialogOpen(true);
          }}
        />
      )}
      <CustomDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Meeting"
        description="Are you sure you want to delete this meeting? This action cannot be undone."
        onConfirm={() => {
          if (meetingToDelete) {
            deleteMutation.mutate(meetingToDelete);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </CardWidgetContainer>
  );
}

// --- Documents ---

export function EntityDocuments({ entityType, entityId }: EntityActivityProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { formatDate } = useLocalization();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [newName, setNewName] = useState('');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', entityType, entityId, workspace?.id],
    queryFn: () => {
      if (!workspace?.id) return [];
      return getDocumentsService(workspace.id, entityType, entityId);
    },
    enabled: !!workspace?.id,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createDocumentService({
        workspace_id: workspace!.id,
        entity_type: entityType,
        entity_id: entityId,
        file: file!,
      }),
    onSuccess: () => {
      toast.success('Document uploaded');
      setIsOpen(false);
      setFile(null);
      queryClient.invalidateQueries({
        queryKey: ['documents', entityType, entityId, workspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['documents'],
      });
    },
    onError: () => toast.error('Failed to upload document'),
  });

  const updateMutation = useMutation({
    mutationFn: (name: string) =>
      updateDocumentService(editingDoc.id, { name }),
    onSuccess: () => {
      toast.success('Document renamed');
      setIsOpen(false);
      setEditingDoc(null);
      setNewName('');
      queryClient.invalidateQueries({
        queryKey: ['documents', entityType, entityId, workspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['documents'],
      });
    },
    onError: () => toast.error('Failed to rename document'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocumentService,
    onSuccess: () => {
      toast.success('Document deleted');
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
      queryClient.invalidateQueries({
        queryKey: ['documents', entityType, entityId, workspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['documents'],
      });
    },
    onError: () => {
      toast.error('Failed to delete document');
      setIsDeleteDialogOpen(false);
      setDocumentToDelete(null);
    },
  });

  const handleSave = () => {
    if (editingDoc) {
      updateMutation.mutate(newName);
    } else {
      createMutation.mutate();
    }
  };

  const openEditDialog = (doc: any) => {
    setEditingDoc(doc);
    setNewName(doc.name);
    setIsOpen(true);
  };

  return (
    <CardWidgetContainer
      title="Documents"
      headerClassName="p-2 xl:p-2 2xl:p-2 mb-1"
      icon={<Download className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      icon2={
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingDoc(null);
              setNewName('');
              setFile(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="gap-1 text-sm text-blue-500 hover:text-blue-600">
              <Plus className="h-4 w-4" />
              Upload
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? 'Rename Document' : 'Upload Document'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 space-y-2 px-2">
              {editingDoc ? (
                <div className="space-y-2">
                  <Label>Document Name</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Select File</Label>
                  <Input
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="selectFileDetails"
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={
                  createMutation.isPending || updateMutation.isPending
                }
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  (!editingDoc && !file) ||
                  (editingDoc && !newName) ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingDoc
                    ? 'Rename'
                    : 'Upload'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="px-2 mb-2">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : documents.length > 0 ? (
          <CardWidgetList>
            {documents.map((doc: any) => (
              <CardWidgetListItem
                key={doc.id}
                icon={
                  <div className="rounded border border-gray-200/50 bg-white p-2 dark:bg-slate-800">
                    <File className="h-4 w-4 text-blue-500" />
                  </div>
                }
                iconAlignTop={true}
                title={
                  <span
                    className="text-sm font-medium text-gray-900 dark:text-gray-100"
                    onClick={() => openEditDialog(doc)}
                  >
                    {doc.name}
                  </span>
                }
                metadata={
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    <span>
                      Created by {doc.created_by_user?.name || 'Unknown'} on {formatDate(doc.created_at)}
                    </span>
                    {doc.updated_by && doc.updated_by_user && (
                      <span>
                        Updated by {doc.updated_by_user.name || 'Unknown'} on {formatDate(doc.updated_at)}
                      </span>
                    )}
                    {doc.entity_name && doc.entity_type !== entityType && (
                      <span className="text-blue-600 dark:text-blue-400">
                        from {doc.entity_type}: {doc.entity_name}
                      </span>
                    )}
                  </div>
                }
                actions={
                  <>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(doc)}
                      className="h-7 w-7 text-gray-400 hover:text-blue-500"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setDocumentToDelete(doc.id);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-blue-500"
                      title="View"
                      asChild
                    >
                      <a
                        href={`/api/documents/${doc.id}/download?mode=view`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-green-500"
                      title="Download"
                      asChild
                    >
                      <a
                        href={`/api/documents/${doc.id}/download?mode=download`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </Button>
                  </>
                }
              />
            ))}
          </CardWidgetList>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F3FF]">
              <Download className="h-6 w-6 text-blue-500" />
            </div>
            <p className="mt-4 text-sm text-gray-500">No documents</p>
          </div>
        )}
      </div>
      <CustomDeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Delete Document"
        description="Are you sure you want to delete this document? This action cannot be undone."
        onConfirm={() => {
          if (documentToDelete) {
            deleteMutation.mutate(documentToDelete);
          }
        }}
        isDeleting={deleteMutation.isPending}
      />
    </CardWidgetContainer>
  );
}
