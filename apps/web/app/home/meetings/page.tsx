'use client';

import React, { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Calendar as CalendarIcon,
    Clock,
    Filter,
    Loader2,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    Pencil,
    MapPin,
    User,
    Building2,
    Users,
    Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent } from '@kit/ui/card';
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
import { Label } from '@kit/ui/label';
import { PageBody, PageHeader } from '@kit/ui/page';
import {
    RadioGroup,
    RadioGroupItem,
} from '@kit/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@kit/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@kit/ui/table';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
    Meeting,
    createMeetingService,
    deleteMeetingService,
    getMeetingsService,
    updateMeetingService,
} from '~/services/activities.service';
import { getLeadsService } from '~/services/leads.service';
import { getContactsService } from '~/services/contacts.service';
import { getAccountsService } from '~/services/accounts.service';
import { getOpportunitiesService } from '~/services/opportunities.service';

export default function MeetingsPage() {
    const { currentWorkspace: workspace } = useRBAC();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        location: '',
        meeting_link: '',
        entity_type: 'lead',
        entityId: '',
    });

    const { data: meetings = [], isLoading } = useQuery({
        queryKey: ['meetings', workspace?.id],
        queryFn: () => {
            if (!workspace?.id) return [];
            return getMeetingsService(workspace.id);
        },
        enabled: !!workspace?.id,
    });

    const { data: leads = [] } = useQuery({
        queryKey: ['leads', workspace?.id],
        queryFn: () => {
            if (!workspace?.id) return [];
            return getLeadsService(workspace.id);
        },
        enabled: !!workspace?.id,
    });

    const { data: contacts = [] } = useQuery({
        queryKey: ['contacts', workspace?.id],
        queryFn: () => {
            if (!workspace?.id) return [];
            return getContactsService(workspace.id);
        },
        enabled: !!workspace?.id,
    });

    const { data: accounts = [] } = useQuery({
        queryKey: ['accounts', workspace?.id],
        queryFn: () => {
            if (!workspace?.id) return [];
            return getAccountsService(workspace.id);
        },
        enabled: !!workspace?.id,
    });

    const { data: opportunities = [] } = useQuery({
        queryKey: ['opportunities', workspace?.id],
        queryFn: () => {
            if (!workspace?.id) return [];
            return getOpportunitiesService(workspace.id);
        },
        enabled: !!workspace?.id,
    });

    const createMutation = useMutation({
        mutationFn: (payload: any) =>
            createMeetingService({
                workspace_id: workspace!.id,
                entity_type: payload.entity_type,
                entity_id: payload.entityId,
                title: payload.title,
                description: payload.description,
                start_time: new Date(payload.start_time).toISOString(),
                end_time: new Date(payload.end_time).toISOString(),
                location: payload.location,
                meeting_link: payload.meeting_link,
            }),
        onSuccess: () => {
            toast.success('Meeting scheduled');
            setIsCreateDialogOpen(false);
            setFormData({
                title: '',
                description: '',
                start_time: '',
                end_time: '',
                location: '',
                meeting_link: '',
                entity_type: 'lead',
                entityId: '',
            });
            queryClient.invalidateQueries({ queryKey: ['meetings', workspace?.id] });
        },
        onError: () => toast.error('Failed to schedule meeting'),
    });

    const updateMutation = useMutation({
        mutationFn: (payload: any) =>
            updateMeetingService(editingMeeting!.id, payload),
        onSuccess: () => {
            toast.success('Meeting updated');
            setIsEditDialogOpen(false);
            setEditingMeeting(null);
            queryClient.invalidateQueries({ queryKey: ['meetings', workspace?.id] });
        },
        onError: () => toast.error('Failed to update meeting'),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteMeetingService,
        onSuccess: () => {
            toast.success('Meeting deleted');
            queryClient.invalidateQueries({ queryKey: ['meetings', workspace?.id] });
        },
        onError: () => toast.error('Failed to delete meeting'),
    });

    const filteredMeetings = useMemo(() => {
        return meetings.filter((meeting: Meeting) => {
            const matchesSearch =
                meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (meeting.created_by_user?.name || '')
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());

            const now = new Date();
            const endTime = new Date(meeting.end_time);
            const isCompleted = endTime < now;

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'completed' && isCompleted) ||
                (statusFilter === 'scheduled' && !isCompleted);

            return matchesSearch && matchesStatus;
        });
    }, [meetings, searchTerm, statusFilter]);

    const handleCreate = () => {
        if (!formData.title.trim() || !formData.entityId || !formData.start_time || !formData.end_time) return;
        createMutation.mutate(formData);
    };

    const handleEdit = (meeting: Meeting) => {
        setEditingMeeting(meeting);
        setFormData({
            title: meeting.title,
            description: meeting.description || '',
            start_time: new Date(meeting.start_time).toISOString().slice(0, 16),
            end_time: new Date(meeting.end_time).toISOString().slice(0, 16),
            location: meeting.location || '',
            meeting_link: meeting.meeting_link || '',
            entity_type: meeting.entity_type || 'lead',
            entityId: meeting.entity_id,
        });
        setIsEditDialogOpen(true);
    };

    const handleSave = () => {
        if (!editingMeeting || !formData.title.trim()) return;
        updateMutation.mutate({
            title: formData.title,
            description: formData.description,
            start_time: new Date(formData.start_time).toISOString(),
            end_time: new Date(formData.end_time).toISOString(),
            location: formData.location,
            meeting_link: formData.meeting_link,
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this meeting?')) {
            deleteMutation.mutate(id);
        }
    };

    const getStatusBadge = (startTime: string, endTime: string) => {
        const now = new Date();
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (end < now) {
            return (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-500">
                    Completed
                </Badge>
            );
        }
        if (start <= now && end >= now) {
            return (
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-500">
                    In Progress
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-500">
                Scheduled
            </Badge>
        );
    };

    if (!workspace) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title="Meetings"
                description="Manage and schedule your meetings with leads and clients"
            >
                <Button className="gap-2" onClick={() => {
                    setFormData({ title: '', description: '', start_time: '', end_time: '', location: '', meeting_link: '', entity_type: 'lead', entityId: '' });
                    setIsCreateDialogOpen(true);
                }}>
                    <Plus className="h-4 w-4" />
                    New Meeting
                </Button>

            </PageHeader>

            <PageBody>
                <div className="space-y-6">
                    {/* Search and Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col items-center gap-4 md:flex-row">
                                <div className="relative w-full flex-1">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                                    <Input
                                        placeholder="Search by title or host..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex w-full items-center gap-2 md:w-auto">
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full md:w-[180px]">
                                            <Filter className="mr-2 h-4 w-4" />
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="scheduled">Scheduled</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Meetings List Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Meeting Title</TableHead>
                                        <TableHead>Host</TableHead>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Entity</TableHead>
                                        <TableHead className="pr-6 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredMeetings.length > 0 ? (
                                        filteredMeetings.map((meeting: Meeting) => (
                                            <TableRow key={meeting.id}>
                                                <TableCell className="pl-6 font-medium">
                                                    <div>
                                                        <p>{meeting.title}</p>
                                                        {meeting.description && (
                                                            <p className="text-muted-foreground text-xs font-normal">{meeting.description}</p>
                                                        )}
                                                        {meeting.location && (
                                                            <p className="text-muted-foreground flex items-center gap-1 text-[10px] items-center font-normal">
                                                                <MapPin className="h-3 w-3" /> {meeting.location}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="bg-secondary flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold">
                                                            {(meeting.created_by_user?.name || 'U')
                                                                .split(' ')
                                                                .map((n) => n[0])
                                                                .join('')}
                                                        </div>
                                                        <span className="text-sm">
                                                            {meeting.created_by_user?.name || 'System'}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-medium">
                                                            {new Date(meeting.start_time).toLocaleDateString()}
                                                        </span>
                                                        <span className="text-muted-foreground text-xs">
                                                            {new Date(meeting.start_time).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}{' '}
                                                            -{' '}
                                                            {new Date(meeting.end_time).toLocaleTimeString([], {
                                                                hour: '2-digit',
                                                                minute: '2-digit',
                                                            })}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(meeting.start_time, meeting.end_time)}
                                                </TableCell>
                                                <TableCell>
                                                    {meeting.entity_name && (
                                                        <span className="text-muted-foreground text-xs" title={`${meeting.entity_type}: ${meeting.entity_name}`}>
                                                            {meeting.entity_name}
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                className="gap-2"
                                                                onClick={() => handleEdit(meeting)}
                                                            >
                                                                <Pencil className="h-4 w-4" /> Edit Meeting
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="gap-2 text-red-500"
                                                                onClick={() => handleDelete(meeting.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" /> Cancel/Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="h-24 text-center text-muted-foreground"
                                            >
                                                No meetings found matching your filters.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </PageBody>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Schedule New Meeting</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-4">
                            <Label>Associate with</Label>
                            <RadioGroup
                                value={formData.entity_type}
                                onValueChange={(val) => setFormData({ ...formData, entity_type: val, entityId: '' })}
                                className="flex flex-wrap gap-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="lead" id="lead" />
                                    <Label htmlFor="lead" className="flex items-center gap-1 cursor-pointer">
                                        <User className="h-3 w-3" /> Lead
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="contact" id="contact" />
                                    <Label htmlFor="contact" className="flex items-center gap-1 cursor-pointer">
                                        <Users className="h-3 w-3" /> Contact
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="account" id="account" />
                                    <Label htmlFor="account" className="flex items-center gap-1 cursor-pointer">
                                        <Building2 className="h-3 w-3" /> Account
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="opportunity" id="opportunity" />
                                    <Label htmlFor="opportunity" className="flex items-center gap-1 cursor-pointer">
                                        <Briefcase className="h-3 w-3" /> Opportunity
                                    </Label>
                                </div>
                            </RadioGroup>

                            <Select
                                value={formData.entityId}
                                onValueChange={(val) => setFormData({ ...formData, entityId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={`Select ${formData.entity_type}...`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {formData.entity_type === 'lead' && leads.map((lead: any) => (
                                        <SelectItem key={lead.id} value={lead.id}>
                                            {lead.first_name} {lead.last_name || ''}
                                        </SelectItem>
                                    ))}
                                    {formData.entity_type === 'contact' && contacts.map((contact: any) => (
                                        <SelectItem key={contact.id} value={contact.id}>
                                            {contact.first_name} {contact.last_name || ''}
                                        </SelectItem>
                                    ))}
                                    {formData.entity_type === 'account' && accounts.map((account: any) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.account_name}
                                        </SelectItem>
                                    ))}
                                    {formData.entity_type === 'opportunity' && opportunities.map((opportunity: any) => (
                                        <SelectItem key={opportunity.id} value={opportunity.id}>
                                            {opportunity.opportunity_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Meeting agenda..."
                            />
                        </div>
                        <div className="grid grid-cols-2 ">
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
                            onClick={handleCreate}
                            disabled={
                                !formData.title.trim() ||
                                !formData.entityId ||
                                !formData.start_time ||
                                !formData.end_time ||
                                createMutation.isPending
                            }
                            className="w-full"
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                'Schedule Meeting'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit Meeting</DialogTitle>
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
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Meeting agenda..."
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
                                !formData.title.trim() ||
                                !formData.start_time ||
                                !formData.end_time ||
                                updateMutation.isPending
                            }
                            className="w-full"
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                'Update Meeting'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
