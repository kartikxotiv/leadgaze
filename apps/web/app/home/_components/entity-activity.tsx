'use client';

import { useState } from 'react';

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

import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-base">Reminders</CardTitle>
        </div>
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
            <Button size="sm" variant="ghost" className="gap-1 text-xs">
              <Plus className="h-3 w-3" />
              Set
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingReminder ? 'Edit Reminder' : 'Set Reminder'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
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
                />
              </div>
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : reminders.length > 0 ? (
          <div className="space-y-3">
            {reminders.map((reminder: any) => (
              <div
                key={reminder.id}
                className="group flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-slate-900"
              >
                <div
                  className="flex cursor-pointer items-center gap-3"
                  onClick={() => openEditDialog(reminder)}
                >
                  <div
                    className={`h-2 w-2 cursor-pointer rounded-full ${reminder.is_completed ? 'bg-green-500' : 'bg-amber-500'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCompletion(reminder);
                    }}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${reminder.is_completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}
                    >
                      {reminder.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      {reminder.due_date && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(reminder.due_date).toLocaleString()}
                        </span>
                      )}
                      {reminder.created_by_user && (
                        <span>by {reminder.created_by_user.name}</span>
                      )}
                      {reminder.entity_name &&
                        reminder.entity_type !== entityType && (
                          <span className="text-blue-600 dark:text-blue-400">
                            from {reminder.entity_type}: {reminder.entity_name}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => openEditDialog(reminder)}
                    className="p-1 text-gray-400 hover:text-blue-500"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          'Are you sure you want to delete this reminder?',
                        )
                      ) {
                        deleteMutation.mutate(reminder.id);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No reminders</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- Meetings ---

export function EntityMeetings({ entityType, entityId }: EntityActivityProps) {
  const { currentWorkspace: workspace } = useRBAC();
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-base">Meetings</CardTitle>
        </div>
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
            <Button size="sm" variant="ghost" className="gap-1 text-xs">
              <Plus className="h-3 w-3" />
              Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingMeeting ? 'Edit Meeting' : 'Schedule Meeting'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : meetings.length > 0 ? (
          <div className="space-y-3">
            {meetings.map((meeting: any) => (
              <div
                key={meeting.id}
                className="group relative rounded-lg border border-transparent bg-gray-50 p-3 transition-colors hover:border-gray-200 dark:bg-slate-900"
              >
                <div
                  className="cursor-pointer"
                  onClick={() => openEditDialog(meeting)}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {meeting.title}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(meeting.start_time).toLocaleString()}
                    </span>
                    {meeting.created_by_user && (
                      <span>by {meeting.created_by_user.name}</span>
                    )}
                    {meeting.entity_name &&
                      meeting.entity_type !== entityType && (
                        <span className="text-blue-600 dark:text-blue-400">
                          from {meeting.entity_type}: {meeting.entity_name}
                        </span>
                      )}
                  </div>
                  {meeting.location && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span className="max-w-[200px] truncate">
                        {meeting.location}
                      </span>
                    </div>
                  )}
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => openEditDialog(meeting)}
                    className="p-1 text-gray-400 hover:text-blue-500"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm('Are you sure you want to delete this meeting?')
                      ) {
                        deleteMutation.mutate(meeting.id);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Calendar className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No meetings</p>
          </div>
        )}
      </CardContent>
    </Card>
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-base">Documents</CardTitle>
        </div>
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
            <Button size="sm" variant="outline" className="gap-2 text-xs">
              <Plus className="h-3 w-3" />
              Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDoc ? 'Rename Document' : 'Upload Document'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="group flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:bg-slate-900"
              >
                <div
                  className="flex cursor-pointer items-center gap-3"
                  onClick={() => openEditDialog(doc)}
                >
                  <div className="rounded border bg-white p-2 dark:bg-slate-800">
                    <File className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {doc.name}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span>
                        {new Date(doc.created_at).toLocaleDateString()}
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
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => openEditDialog(doc)}
                    className="p-1 text-gray-400 hover:text-blue-500"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          'Are you sure you want to delete this document?',
                        )
                      ) {
                        deleteMutation.mutate(doc.id);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400"
                    asChild
                  >
                    <a
                      href={`/api/documents/download/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Download className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-500">No documents</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
