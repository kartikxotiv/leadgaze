'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    Calendar,
    CheckCircle,
    Clock,
    Download,
    File,
    Loader2,
    MapPin,
    Plus,
    Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@kit/ui/select';
import { Textarea } from '@kit/ui/textarea';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
    createDocumentService,
    createMeetingService,
    createReminderService,
    deleteReminderService,
    getDocumentsService,
    getMeetingsService,
    getRemindersService,
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
    const [formData, setFormData] = useState({ title: '', due_date: '', priority: 'medium' });

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
                due_date: formData.due_date ? new Date(formData.due_date).toISOString() : undefined,
            }),
        onSuccess: () => {
            toast.success('Reminder set');
            setIsOpen(false);
            setFormData({ title: '', due_date: '', priority: 'medium' });
            queryClient.invalidateQueries({ queryKey: ['reminders', entityType, entityId] });
        },
        onError: () => toast.error('Failed to set reminder'),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteReminderService,
        onSuccess: () => {
            toast.success('Reminder deleted');
            queryClient.invalidateQueries({ queryKey: ['reminders', entityType, entityId] });
        },
        onError: () => toast.error('Failed to delete reminder'),
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-base">Reminders</CardTitle>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs">
                            <Plus className="h-3 w-3" />
                            Set
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Set Reminder</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Call client..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Due Date</Label>
                                <Input
                                    type="datetime-local"
                                    value={formData.due_date}
                                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                                />
                            </div>
                            <Button
                                onClick={() => createMutation.mutate()}
                                disabled={!formData.title || createMutation.isPending}
                                className="w-full"
                            >
                                {createMutation.isPending ? 'Saving...' : 'Set Reminder'}
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
                            <div key={reminder.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-slate-900 group">
                                <div className="flex items-center gap-3">
                                    <div className={`h-2 w-2 rounded-full ${reminder.is_completed ? 'bg-green-500' : 'bg-amber-500'}`} />
                                    <div>
                                        <p className={`text-sm font-medium ${reminder.is_completed ? 'line-through text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                                            {reminder.title}
                                        </p>
                                        {reminder.due_date && (
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {new Date(reminder.due_date).toLocaleString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => deleteMutation.mutate(reminder.id)}
                                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center bg-gray-50/50 rounded-lg">
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
        meeting_link: ''
    });

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
                meeting_link: formData.meeting_link
            }),
        onSuccess: () => {
            toast.success('Meeting scheduled');
            setIsOpen(false);
            setFormData({ title: '', start_time: '', end_time: '', location: '', meeting_link: '' });
            queryClient.invalidateQueries({ queryKey: ['meetings', entityType, entityId] });
        },
        onError: () => toast.error('Failed to schedule meeting'),
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-base">Meetings</CardTitle>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs">
                            <Plus className="h-3 w-3" />
                            Schedule
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Schedule Meeting</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="Demo meeting..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Start</Label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.start_time}
                                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>End</Label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.end_time}
                                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Location / Link</Label>
                                <Input
                                    value={formData.location || formData.meeting_link}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Zoom, Google Meet, or Office..."
                                />
                            </div>
                            <Button
                                onClick={() => createMutation.mutate()}
                                disabled={!formData.title || !formData.start_time || createMutation.isPending}
                                className="w-full"
                            >
                                {createMutation.isPending ? 'Scheduling...' : 'Schedule Meeting'}
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
                            <div key={meeting.id} className="rounded-lg bg-gray-50 p-3 dark:bg-slate-900 border border-transparent hover:border-gray-200 transition-colors">
                                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{meeting.title}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(meeting.start_time).toLocaleString()}</span>
                                </div>
                                {meeting.location && (
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                        <MapPin className="w-3 h-3" />
                                        <span className="truncate max-w-[200px]">{meeting.location}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center bg-gray-50/50 rounded-lg">
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
            queryClient.invalidateQueries({ queryKey: ['documents', entityType, entityId] });
        },
        onError: () => toast.error('Failed to upload document'),
    });

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                    <Download className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-base">Documents</CardTitle>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-2 text-xs">
                            <Plus className="h-3 w-3" />
                            Upload
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Upload Document</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Select File</Label>
                                <Input
                                    type="file"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            <Button
                                onClick={() => createMutation.mutate()}
                                disabled={!file || createMutation.isPending}
                                className="w-full"
                            >
                                {createMutation.isPending ? 'Uploading...' : 'Upload'}
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
                            <div key={doc.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-slate-900 hover:bg-gray-100 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white p-2 rounded border dark:bg-slate-800">
                                        <File className="w-4 h-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{doc.name}</p>
                                        <p className="text-xs text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                                    <Download className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center bg-gray-50/50 rounded-lg">
                        <Download className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-500">No documents</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
