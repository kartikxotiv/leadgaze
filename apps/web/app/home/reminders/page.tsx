/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    Calendar as CalendarIcon,
    CheckCircle2,
    Clock,
    Filter,
    Loader2,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
    Pencil,
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
    Reminder,
    createReminderService,
    deleteReminderService,
    getRemindersService,
    updateReminderService,
} from '~/services/activities.service';
import { getLeadsService } from '~/services/leads.service';
import { getContactsService } from '~/services/contacts.service';
import { getAccountsService } from '~/services/accounts.service';
import { getOpportunitiesService } from '~/services/opportunities.service';

export default function RemindersPage() {
    const { currentWorkspace: workspace } = useRBAC();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        due_date: '',
        priority: 'medium',
        entity_type: 'lead',
        entityId: '',
    });

    const { data: reminders = [], isLoading } = useQuery({
        queryKey: ['reminders', workspace?.id],
        queryFn: () => {
            if (!workspace?.id) return [];
            return getRemindersService(workspace.id);
        },
        enabled: !!workspace?.id,
    });

    const { data: leads = [] } = useQuery({
        queryKey: ['leads', workspace?.id],
        queryFn: async () => {
            if (!workspace?.id) return [];
            const res = await getLeadsService({ workspaceId: workspace?.id });
            return res?.data ?? []
        },
        enabled: !!workspace?.id,
    });

    const { data: contacts = [] } = useQuery({
        queryKey: ['contacts', workspace?.id],
        queryFn: async () => {
            if (!workspace?.id) return [];
            const res = await getContactsService({ workspaceId: workspace?.id });
            return res?.data ?? []
        },
        enabled: !!workspace?.id,
    });

    const { data: accounts = [] } = useQuery({
        queryKey: ['accounts', workspace?.id],
        queryFn: async () => {
            if (!workspace?.id) return [];
            const res = await getAccountsService({ workspaceId: workspace?.id });
            return res?.data ?? [];
        },
        enabled: !!workspace?.id,
    });

    const { data: opportunities = [] } = useQuery({
        queryKey: ['opportunities', workspace?.id],
        queryFn: async () => {
            if (!workspace?.id) return [];
            const res = await getOpportunitiesService({ workspaceId: workspace?.id });
            return res?.data ?? [];
        },
        enabled: !!workspace?.id,
    });


    const createMutation = useMutation({
        mutationFn: (payload: any) =>
            createReminderService({
                workspace_id: workspace!.id,
                entity_type: payload.entity_type,
                entity_id: payload.entityId,
                title: payload.title,
                description: payload.description,
                priority: payload.priority,
                due_date: payload.due_date ? new Date(payload.due_date).toISOString() : undefined,
            }),
        onSuccess: () => {
            toast.success('Reminder added');
            setIsCreateDialogOpen(false);
            setFormData({ title: '', description: '', due_date: '', priority: 'medium', entity_type: 'lead', entityId: '' });
            queryClient.invalidateQueries({ queryKey: ['reminders', workspace?.id] });
        },
        onError: () => toast.error('Failed to add reminder'),
    });

    const updateMutation = useMutation({
        mutationFn: (payload: any) =>
            updateReminderService(editingReminder!.id, payload),
        onSuccess: () => {
            toast.success('Reminder updated');
            setIsEditDialogOpen(false);
            setEditingReminder(null);
            queryClient.invalidateQueries({ queryKey: ['reminders', workspace?.id] });
        },
        onError: () => toast.error('Failed to update reminder'),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteReminderService,
        onSuccess: () => {
            toast.success('Reminder deleted');
            queryClient.invalidateQueries({ queryKey: ['reminders', workspace?.id] });
        },
        onError: () => toast.error('Failed to delete reminder'),
    });

    const filteredReminders = useMemo(() => {
        return reminders.filter((reminder: Reminder) => {
            const matchesSearch = reminder.title
                .toLowerCase()
                .includes(searchTerm.toLowerCase());
            const matchesPriority =
                priorityFilter === 'all' ||
                reminder.priority.toLowerCase() === priorityFilter.toLowerCase();
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'completed' && reminder.is_completed) ||
                (statusFilter === 'pending' && !reminder.is_completed);
            return matchesSearch && matchesPriority && matchesStatus;
        });
    }, [reminders, searchTerm, priorityFilter, statusFilter]);

    const handleCreate = () => {
        if (!formData.title.trim() || !formData.entityId) return;
        createMutation.mutate(formData);
    };

    const handleEdit = (reminder: Reminder) => {
        setEditingReminder(reminder);
        setFormData({
            title: reminder.title,
            description: reminder.description || '',
            due_date: reminder.due_date
                ? new Date(reminder.due_date).toISOString().slice(0, 16)
                : '',
            priority: reminder.priority || 'medium',
            entity_type: reminder.entity_type || 'lead',
            entityId: reminder.entity_id,
        });
        setIsEditDialogOpen(true);
    };

    const handleSave = () => {
        if (!editingReminder || !formData.title.trim()) return;
        updateMutation.mutate({
            title: formData.title,
            description: formData.description,
            priority: formData.priority,
            due_date: formData.due_date
                ? new Date(formData.due_date).toISOString()
                : null,
        });
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this reminder?')) {
            deleteMutation.mutate(id);
        }
    };

    const toggleCompletion = (reminder: Reminder) => {
        updateReminderService(reminder.id, {
            is_completed: !reminder.is_completed,
        }).then(() => {
            queryClient.invalidateQueries({ queryKey: ['reminders', workspace?.id] });
            toast.success(
                reminder.is_completed
                    ? 'Reminder marked as active'
                    : 'Reminder marked as completed',
            );
        });
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'high':
                return (
                    <Badge variant="outline" className="border-red-200 bg-red-50 text-red-600">
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

    const getStatusBadge = (completed: boolean) => {
        if (completed) {
            return (
                <Badge variant="outline" className="border-green-200 bg-green-50 text-green-500">
                    <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-500">
                <Clock className="mr-1 h-3 w-3" /> Pending
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
                title="Reminders"
                description="Keep track of your important tasks and reminders"
            >
                <Button className="gap-2" onClick={() => {
                    setFormData({ title: '', description: '', due_date: '', priority: 'medium', entity_type: 'lead', entityId: '' });
                    setIsCreateDialogOpen(true);
                }}>
                    <Plus className="h-4 w-4" />
                    New Reminder
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
                                        placeholder="Search tasks..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex w-full items-center gap-2 md:w-auto">
                                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                                        <SelectTrigger className="w-full md:w-[150px]">
                                            <Filter className="mr-2 h-4 w-4" />
                                            <SelectValue placeholder="Priority" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Priorities</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="low">Low</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full md:w-[150px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Reminders List Table */}
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">Task Title</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Due Date</TableHead>
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
                                    ) : filteredReminders.length > 0 ? (
                                        filteredReminders.map((reminder: Reminder) => (
                                            <TableRow key={reminder.id}>
                                                <TableCell className="pl-6 font-medium">
                                                    <div>
                                                        <p>{reminder.title}</p>
                                                        {reminder.description && (
                                                            <p className="text-muted-foreground text-xs font-normal">{reminder.description}</p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getPriorityBadge(reminder.priority)}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {reminder.due_date
                                                        ? new Date(reminder.due_date).toLocaleString()
                                                        : '-'}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(reminder.is_completed)}</TableCell>
                                                <TableCell>
                                                    {reminder.entity_name && (
                                                        <span className="text-muted-foreground text-xs" title={`${reminder.entity_type}: ${reminder.entity_name}`}>
                                                            {reminder.entity_name}
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
                                                                onClick={() => handleEdit(reminder)}
                                                            >
                                                                <Pencil className="h-4 w-4" /> Edit Task
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="gap-2 text-green-600"
                                                                onClick={() => toggleCompletion(reminder)}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />{' '}
                                                                {reminder.is_completed
                                                                    ? 'Mark as Pending'
                                                                    : 'Mark as Completed'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                className="gap-2 text-red-500"
                                                                onClick={() => handleDelete(reminder.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" /> Delete Reminder
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
                                                No reminders found matching your filters.
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Reminder</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
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
                                    {formData.entity_type === 'lead' && leads?.map((lead: any) => (
                                        <SelectItem key={lead.id} value={lead.id}>
                                            {lead.first_name} {lead.last_name || ''}
                                        </SelectItem>
                                    ))}
                                    {formData.entity_type === 'contact' && contacts?.map((contact: any) => (
                                        <SelectItem key={contact.id} value={contact.id}>
                                            {contact.first_name} {contact.last_name || ''}
                                        </SelectItem>
                                    ))}
                                    {formData.entity_type === 'account' && accounts?.map((account: any) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.account_name}
                                        </SelectItem>
                                    ))}
                                    {formData.entity_type === 'opportunity' && opportunities?.map((opportunity: any) => (
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
                                placeholder="Call client..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Add more details..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(val) => setFormData({ ...formData, priority: val })}
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
                            onClick={handleCreate}
                            disabled={!formData.title.trim() || !formData.entityId || createMutation.isPending}
                            className="w-full"
                        >
                            {createMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                'Save Reminder'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>



            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Reminder</DialogTitle>
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
                            <Label>Description</Label>
                            <Input
                                value={formData.description}
                                onChange={(e) =>
                                    setFormData({ ...formData, description: e.target.value })
                                }
                                placeholder="Add more details..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(val) => setFormData({ ...formData, priority: val })}
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
                            disabled={!formData.title.trim() || updateMutation.isPending}
                            className="w-full"
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                'Update Reminder'
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
