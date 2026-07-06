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

import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import { CardWidgetList, CardWidgetListItem } from '@kit/ui/card-widget-list';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

import { useLocalization } from '~/lib/localization/localization-provider';
import { useHasPermission } from '~/lib/permissions/use-permissions';
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

interface EntityActivityProps {
  entityType: string;
  entityId: string;
}

// --- Reminders ---

export function EntityReminders({ entityType, entityId }: EntityActivityProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { formatDate } = useLocalization();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [reminderTab, setReminderTab] = useState<'active' | 'sent'>('active');
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    priority: 'medium',
  });
  const [editingReminder, setEditingReminder] = useState<any>(null);

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
        due_date: formData.due_date
          ? new Date(formData.due_date).toISOString()
          : undefined,
      }),
    onSuccess: () => {
      toast.success('Reminder set');
      setIsOpen(false);
      setFormData({ title: '', due_date: '', priority: 'medium' });
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
      setFormData({ title: '', due_date: '', priority: 'medium' });
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
      queryClient.invalidateQueries({
        queryKey: ['reminders', entityType, entityId, workspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['reminders'],
      });
    },
    onError: () => toast.error('Failed to delete reminder'),
  });

  const handleSave = () => {
    const payload = {
      title: formData.title,
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
          ? 'Reminder marked as active'
          : 'Reminder marked as completed',
      );
    });
  };

  return (
    <CardWidgetContainer
      title="Reminders"
      hideHeaderBorder={true}
      icon={<AlertCircle className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      icon2={
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) {
              setEditingReminder(null);
              setFormData({ title: '', due_date: '', priority: 'medium' });
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
            <DialogHeader className="border-b p-6 pb-4">
              <DialogTitle>
                {editingReminder ? 'Edit Reminder' : 'Set Reminder'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 space-y-4 px-6 py-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Call client..."
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData({ ...formData, due_date: e.target.value })
                  }
                  onClick={(e) => {
                    try {
                      e.currentTarget.showPicker();
                    } catch (err) {}
                  }}
                />
              </div>
            </div>
            <div className="border-t p-6 pt-4">
              <Button
                onClick={handleSave}
                disabled={
                  !formData.title ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                className="w-full"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingReminder
                    ? 'Update Reminder'
                    : 'Set Reminder'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="px-6 py-3">
        {/* Active / Sent toggle (mirrors Notes pattern) */}
        <div className="flex bg-gray-100/60 dark:bg-gray-800/60 p-0.5 rounded-lg mb-4 w-fit border border-gray-200/20">
          <button
            onClick={() => setReminderTab('active')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
              reminderTab === 'active'
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setReminderTab('sent')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
              reminderTab === 'sent'
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Sent
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
                  <div
                    className={`h-2 w-2 cursor-pointer rounded-full ${reminder.is_completed ? 'bg-green-500' : 'bg-amber-500'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompletion(reminder);
                    }}
                  />
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
                metadata={
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {reminder.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                         Due: {formatDate(reminder.due_date)} {new Date(reminder.due_date).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                    <span>
                      Created by {reminder.created_by_user?.name || 'Unknown'} on {formatDate(reminder.created_at)}
                    </span>
                    {/* {reminder.updated_by && reminder.updated_by_user && (
                      <span>
                        Updated by {reminder.updated_by_user.name || 'Unknown'} on {formatDate(reminder.updated_at!)}
                      </span>
                    )} */}
                    {reminder.entity_type !== entityType && (
                        <span className="text-blue-600 dark:text-blue-400">
                          From {reminder.entity_type.charAt(0).toUpperCase() + reminder.entity_type.slice(1)}{reminder.entity_name ? `: ${reminder.entity_name}` : ''}
                        </span>
                      )}
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
                        if (
                          confirm(
                            'Are you sure you want to delete this reminder?',
                          )
                        ) {
                          deleteMutation.mutate(reminder.id);
                        }
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
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No reminders</p>
          </div>
        )}
      </div>
    </CardWidgetContainer>
  );
}

// --- Meetings ---

export function EntityMeetings({ entityType, entityId }: EntityActivityProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const { formatDate } = useLocalization();

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
  const [isOpen, setIsOpen] = useState(false);
  const [meetingType, setMeetingType] = useState<MeetingType>('scheduled');
  const [provider, setProvider] = useState<MeetingProvider>('MANUAL');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_start: '',
    scheduled_end: '',
    actual_start: '',
    actual_end: '',
    timezone: 'UTC',
    meeting_url: '',
    location: '',
  });
  const [externalEmails, setExternalEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [duration, setDuration] = useState(30);
  const [editingMeeting, setEditingMeeting] = useState<CoreMeeting | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

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
    return meetings.filter((meeting) => {
      const start = meeting.scheduled_start || meeting.start_time || meeting.actual_start;
      if (!start) return activeTab === 'upcoming';
      const isUpcoming = new Date(start) >= now && meeting.status !== 'completed' && meeting.status !== 'cancelled';
      return activeTab === 'upcoming' ? isUpcoming : !isUpcoming;
    });
  }, [meetings, activeTab]);

  // Calculate end time from start time + duration
  const getEndTime = (): string => {
    if (!formData.scheduled_start) return '';
    const start = new Date(formData.scheduled_start);
    start.setMinutes(start.getMinutes() + duration);
    return start.toISOString();
  };

  const handleAddEmail = () => {
    if (newEmail && newEmail.includes('@') && !externalEmails.includes(newEmail)) {
      setExternalEmails([...externalEmails, newEmail]);
      setNewEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setExternalEmails(externalEmails.filter((e) => e !== email));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: Parameters<typeof createCoreMeetingService>[0] = {
        workspace_id: workspace!.id,
        meeting_type: meetingType,
        provider,
        title: formData.title,
        description: formData.description || undefined,
        scheduled_start: meetingType === 'scheduled' && formData.scheduled_start
          ? new Date(formData.scheduled_start).toISOString()
          : undefined,
        scheduled_end: meetingType === 'scheduled' && formData.scheduled_start
          ? getEndTime()
          : undefined,
        actual_start: meetingType === 'logged' && formData.actual_start
          ? new Date(formData.actual_start).toISOString()
          : undefined,
        actual_end: meetingType === 'logged' && formData.actual_end
          ? new Date(formData.actual_end).toISOString()
          : undefined,
        timezone: formData.timezone,
        meeting_url: provider === 'MANUAL' ? formData.meeting_url || undefined : undefined,
        location: formData.location || undefined,
        entity_type: entityType,
        entity_id: entityId,
        participants: externalEmails.map((email) => ({
          participant_type: 'EXTERNAL' as const,
          external_email: email,
          display_name: email,
        })),
      };

      return createCoreMeetingService(payload);
    },
    onSuccess: () => {
      toast.success(meetingType === 'logged' ? 'Meeting logged' : 'Meeting scheduled');
      handleCloseDialog();
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
    onError: () => toast.error('Failed to create meeting'),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingMeeting) return;
      return updateCoreMeetingService({
        id: editingMeeting.id,
        workspace_id: workspace!.id,
        title: formData.title,
        description: formData.description || undefined,
        scheduled_start: formData.scheduled_start
          ? new Date(formData.scheduled_start).toISOString()
          : undefined,
        scheduled_end: formData.scheduled_start ? getEndTime() : undefined,
        location: formData.location || undefined,
        meeting_url: formData.meeting_url || undefined,
        status: editingMeeting.status as MeetingStatus,
      });
    },
    onSuccess: () => {
      toast.success('Meeting updated');
      handleCloseDialog();
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
    onError: () => toast.error('Failed to update meeting'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return deleteCoreMeetingService(workspace!.id, id);
    },
    onSuccess: () => {
      toast.success('Meeting deleted');
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
    onError: () => toast.error('Failed to delete meeting'),
  });

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (meetingType === 'scheduled' && !formData.scheduled_start) {
      toast.error('Start time is required');
      return;
    }
    if (meetingType === 'logged' && (!formData.actual_start || !formData.actual_end)) {
      toast.error('Start and end times are required');
      return;
    }
    if (editingMeeting) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const openEditDialog = (meeting: CoreMeeting) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title,
      description: meeting.description || '',
      scheduled_start: meeting.scheduled_start
        ? new Date(meeting.scheduled_start).toISOString().slice(0, 16)
        : '',
      scheduled_end: meeting.scheduled_end
        ? new Date(meeting.scheduled_end).toISOString().slice(0, 16)
        : '',
      actual_start: meeting.actual_start
        ? new Date(meeting.actual_start).toISOString().slice(0, 16)
        : '',
      actual_end: meeting.actual_end
        ? new Date(meeting.actual_end).toISOString().slice(0, 16)
        : '',
      timezone: meeting.timezone || 'UTC',
      meeting_url: meeting.meeting_url || '',
      location: meeting.location || '',
    });
    setMeetingType(meeting.meeting_type);
    setProvider(meeting.provider);
    setExternalEmails(
      meeting.participants?.filter((p) => p.external_email).map((p) => p.external_email as string) ?? []
    );
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setEditingMeeting(null);
    setFormData({
      title: '',
      description: '',
      scheduled_start: '',
      scheduled_end: '',
      actual_start: '',
      actual_end: '',
      timezone: 'UTC',
      meeting_url: '',
      location: '',
    });
    setExternalEmails([]);
    setNewEmail('');
    setMeetingType('scheduled');
    setProvider('MANUAL');
    setDuration(30);
  };

  const formatMeetingDate = (meeting: CoreMeeting) => {
    if (meeting.meeting_type === 'scheduled' && meeting.scheduled_start) {
      return formatDate(meeting.scheduled_start);
    }
    if (meeting.actual_start) {
      return formatDate(meeting.actual_start);
    }
    return 'No date';
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
        <div className="py-8 text-center">
          <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">
            {activeTab === 'upcoming' ? 'No upcoming meetings' : 'No previous meetings'}
          </p>
        </div>
      );
    }
    return (
      <CardWidgetList>
        {items.map((meeting: CoreMeeting) => (
          <CardWidgetListItem
            key={meeting.id}
            title={
              <div className="flex items-center gap-2">
                <span
                  className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-blue-600"
                  onClick={() => openEditDialog(meeting)}
                >
                  {meeting.title}
                </span>
                {getStatusBadge(meeting.status)}
              </div>
            }
            content={
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
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
                      onClick={() => openEditDialog(meeting)}
                      className="h-7 w-7 text-gray-400 hover:text-blue-500"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this meeting?')) {
                          deleteMutation.mutate(meeting.id);
                        }
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
    );
  };

  return (
    <CardWidgetContainer
      title="Meetings"
      hideHeaderBorder={true}
      icon={<Calendar className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      icon2={
        canScheduleMeeting && (
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              if (!open) handleCloseDialog();
            }}
          >
            <DialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-sm text-blue-500 hover:text-blue-600"
                onClick={() => setIsOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[500px]">
              <DialogHeader className="border-b p-6 pb-4">
                <DialogTitle>
                  {editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {/* Meeting Type */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Meeting Type
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMeetingType('scheduled')}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        meetingType === 'scheduled'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <CalendarIcon className="h-4 w-4" />
                      Scheduled
                    </button>
                    <button
                      type="button"
                      onClick={() => setMeetingType('logged')}
                      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        meetingType === 'logged'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      Log Past
                    </button>
                  </div>
                </div>

                {/* Provider Selection */}
                {!editingMeeting && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Provider
                    </Label>
                    <div className="flex gap-2">
                      {(['MANUAL', 'GOOGLE', 'ZOOM'] as MeetingProvider[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setProvider(p)}
                          className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                            provider === p
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {p === 'MANUAL' ? 'Manual' : p === 'GOOGLE' ? 'Google Meet' : 'Zoom'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-2">
                  <Label>
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Demo meeting..."
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Meeting agenda..."
                    rows={2}
                  />
                </div>

                {/* Time Selection */}
                {meetingType === 'scheduled' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Start <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="datetime-local"
                        value={formData.scheduled_start}
                        onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Duration</Label>
                      <Select
                        value={String(duration)}
                        onValueChange={(val) => setDuration(Number(val))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 min</SelectItem>
                          <SelectItem value="30">30 min</SelectItem>
                          <SelectItem value="45">45 min</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="90">1.5 hours</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>
                        Start <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="datetime-local"
                        value={formData.actual_start}
                        onChange={(e) => setFormData({ ...formData, actual_start: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        End <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        type="datetime-local"
                        value={formData.actual_end}
                        onChange={(e) => setFormData({ ...formData, actual_end: e.target.value })}
                      />
                    </div>
                  </div>
                )}

                {/* Meeting URL / Location */}
                {provider === 'MANUAL' || meetingType === 'logged' ? (
                  <div className="space-y-2">
                    <Label>Meeting URL</Label>
                    <Input
                      value={formData.meeting_url}
                      onChange={(e) => setFormData({ ...formData, meeting_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Office or address..."
                    />
                  </div>
                )}

                {/* External Participants */}
                <div className="space-y-2">
                  <Label>External Participants</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email@example.com"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddEmail();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={handleAddEmail} className="h-10 w-10">
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
              </div>
              <div className="border-t p-6 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={
                    !formData.title ||
                    (meetingType === 'scheduled' && !formData.scheduled_start) ||
                    (meetingType === 'logged' && (!formData.actual_start || !formData.actual_end)) ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                  className="w-full"
                >
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingMeeting ? 'Update Meeting' : meetingType === 'logged' ? 'Log Meeting' : 'Schedule Meeting'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )
      }
    >
      <div className="px-6 py-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Previous</TabsTrigger>
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
      queryClient.invalidateQueries({
        queryKey: ['documents', entityType, entityId, workspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['documents'],
      });
    },
    onError: () => toast.error('Failed to delete document'),
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
      hideHeaderBorder={true}
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
            <DialogHeader className="border-b p-6 pb-4">
              <DialogTitle>
                {editingDoc ? 'Rename Document' : 'Upload Document'}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 space-y-4 px-6 py-4">
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
                  />
                </div>
              )}
            </div>
            <div className="border-t p-6 pt-4">
              <Button
                onClick={handleSave}
                disabled={
                  (!editingDoc && !file) ||
                  (editingDoc && !newName) ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
                className="w-full"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : editingDoc
                    ? 'Rename'
                    : 'Upload'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="px-6 py-3">
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
                  <div className="rounded border bg-white p-2 dark:bg-slate-800">
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
                        if (
                          confirm(
                            'Are you sure you want to delete this document?',
                          )
                        ) {
                          deleteMutation.mutate(doc.id);
                        }
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
          <div className="py-8 text-center">
            <Download className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No documents</p>
          </div>
        )}
      </div>
    </CardWidgetContainer>
  );
}
