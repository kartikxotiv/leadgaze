'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  Clock,
  Download,
  File,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { formatDate, formatDateTime } from '@kit/shared/utils';
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

import { useHasPermission } from '~/lib/permissions/use-permissions';
import { useRBAC } from '~/lib/rbac/rbac-provider';

import {
  createDocumentService,
  createMeetingService,
  createReminderService,
  deleteDocumentService,
  deleteMeetingService,
  deleteReminderService,
  getDocumentsService,
  getMeetingsService,
  getRemindersService,
  updateDocumentService,
  updateMeetingService,
  updateReminderService,
} from '../../../services/activities.service';

interface EntityActivityProps {
  entityType: string;
  entityId: string;
}

// --- Reminders ---

export function EntityReminders({ entityType, entityId }: EntityActivityProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    due_date: '',
    priority: 'medium',
  });
  const [editingReminder, setEditingReminder] = useState<any>(null);

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders', entityType, entityId],
    queryFn: () => {
      if (!workspace?.id) return [];
      return getRemindersService(workspace.id, entityType, entityId);
    },
    enabled: !!workspace?.id,
  });

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
        queryKey: ['reminders', entityType, entityId],
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
        queryKey: ['reminders', entityType, entityId],
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
        queryKey: ['reminders', entityType, entityId],
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
              Set
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
                  onClick={(e) => e.currentTarget.showPicker()}
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
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : reminders.length > 0 ? (
          <CardWidgetList>
            {reminders.map((reminder: any) => (
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
                  <div className="flex flex-wrap gap-2">
                    {reminder.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(reminder.due_date)}
                      </span>
                    )}
                    {reminder.created_by_user && (
                      <span>by {reminder.created_by_user.name}</span>
                    )}
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
  const [formData, setFormData] = useState({
    title: '',
    start_time: '',
    end_time: '',
    location: '',
    meeting_link: '',
  });
  const [editingMeeting, setEditingMeeting] = useState<any>(null);

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['meetings', entityType, entityId],
    queryFn: () => {
      if (!workspace?.id) return [];
      return getMeetingsService(workspace.id, entityType, entityId);
    },
    enabled: !!workspace?.id,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createMeetingService({
        workspace_id: workspace!.id,
        entity_type: entityType,
        entity_id: entityId,
        title: formData.title,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        location: formData.location,
        meeting_link: formData.meeting_link,
      }),
    onSuccess: () => {
      toast.success('Meeting scheduled');
      setIsOpen(false);
      setFormData({
        title: '',
        start_time: '',
        end_time: '',
        location: '',
        meeting_link: '',
      });
      queryClient.invalidateQueries({
        queryKey: ['meetings', entityType, entityId],
      });
      queryClient.invalidateQueries({
        queryKey: ['meetings'],
      });
    },
    onError: () => toast.error('Failed to schedule meeting'),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: any) =>
      updateMeetingService(editingMeeting.id, payload),
    onSuccess: () => {
      toast.success('Meeting updated');
      setIsOpen(false);
      setEditingMeeting(null);
      setFormData({
        title: '',
        start_time: '',
        end_time: '',
        location: '',
        meeting_link: '',
      });
      queryClient.invalidateQueries({
        queryKey: ['meetings', entityType, entityId],
      });
      queryClient.invalidateQueries({
        queryKey: ['meetings'],
      });
    },
    onError: () => toast.error('Failed to update meeting'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteMeetingService,
    onSuccess: () => {
      toast.success('Meeting deleted');
      queryClient.invalidateQueries({
        queryKey: ['meetings', entityType, entityId],
      });
      queryClient.invalidateQueries({
        queryKey: ['meetings'],
      });
    },
    onError: () => toast.error('Failed to delete meeting'),
  });

  const handleSave = () => {
    const payload = {
      title: formData.title,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
      location: formData.location,
      meeting_link: formData.meeting_link,
    };
    if (editingMeeting) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate();
    }
  };

  const openEditDialog = (meeting: any) => {
    setEditingMeeting(meeting);
    setFormData({
      title: meeting.title,
      start_time: new Date(meeting.start_time).toISOString().slice(0, 16),
      end_time: new Date(meeting.end_time).toISOString().slice(0, 16),
      location: meeting.location || '',
      meeting_link: meeting.meeting_link || '',
    });
    setIsOpen(true);
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
              setIsOpen(open);
              if (!open) {
                setEditingMeeting(null);
                setFormData({
                  title: '',
                  start_time: '',
                  end_time: '',
                  location: '',
                  meeting_link: '',
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="gap-1 text-sm text-blue-500 hover:text-blue-600">
                <Plus className="h-4 w-4" />
                Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[425px]">
              <DialogHeader className="border-b p-6 pb-4">
                <DialogTitle>
                  {editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}
                </DialogTitle>
              </DialogHeader>
              <div className="flex-1 space-y-4 px-6 py-4 overflow-y-auto">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Demo meeting..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div className="space-y-2">
                    <Label>Start</Label>
                    <Input
                      type="datetime-local"
                      value={formData.start_time}
                      onChange={(e) =>
                        setFormData({ ...formData, start_time: e.target.value })
                      }
                      onClick={(e) => e.currentTarget.showPicker()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End</Label>
                    <Input
                      type="datetime-local"
                      value={formData.end_time}
                      onChange={(e) =>
                        setFormData({ ...formData, end_time: e.target.value })
                      }
                      onClick={(e) => e.currentTarget.showPicker()}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Location / Link</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Zoom, Google Meet, or Office..."
                  />
                </div>
              </div>
              <div className="border-t p-6 mt-auto">
                <Button
                  onClick={handleSave}
                  disabled={
                    !formData.title ||
                    !formData.start_time ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                  className="w-full"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingMeeting
                      ? 'Update Meeting'
                      : 'Schedule Meeting'}
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
        ) : meetings.length > 0 ? (
          <CardWidgetList>
            {meetings.map((meeting: any) => (
              <CardWidgetListItem
                key={meeting.id}
                title={
                  <span
                    className="text-sm font-medium text-gray-900 dark:text-gray-100"
                    onClick={() => openEditDialog(meeting)}
                  >
                    {meeting.title}
                  </span>
                }
                content={
                  meeting.location ? (
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span className="max-w-[200px] truncate">
                        {meeting.location}
                      </span>
                    </div>
                  ) : undefined
                }
                metadata={
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(meeting.start_time)}
                    </span>
                    {meeting.created_by_user && (
                      <span>by {meeting.created_by_user.name}</span>
                    )}
                    {meeting.entity_type !== entityType && (
                        <span className="text-blue-600 dark:text-blue-400">
                          From {meeting.entity_type.charAt(0).toUpperCase() + meeting.entity_type.slice(1)}{meeting.entity_name ? `: ${meeting.entity_name}` : ''}
                        </span>
                      )}
                  </div>
                }
                actions={
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
                        if (
                          confirm('Are you sure you want to delete this meeting?')
                        ) {
                          deleteMutation.mutate(meeting.id);
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
            <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No meetings</p>
          </div>
        )}
      </div>
    </CardWidgetContainer>
  );
}

// --- Documents ---

export function EntityDocuments({ entityType, entityId }: EntityActivityProps) {
  const { currentWorkspace: workspace } = useRBAC();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [newName, setNewName] = useState('');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', entityType, entityId],
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
        queryKey: ['documents', entityType, entityId],
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
        queryKey: ['documents', entityType, entityId],
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
        queryKey: ['documents', entityType, entityId],
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
                  <div className="flex flex-wrap gap-2">
                    <span>
                      {formatDate(doc.created_at)}
                    </span>
                    {doc.created_by_user && (
                      <span>by {doc.created_by_user.name}</span>
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
                      className="h-7 w-7 text-gray-400"
                      asChild
                    >
                      <a
                        href={`/api/documents/download/${doc.id}`}
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
