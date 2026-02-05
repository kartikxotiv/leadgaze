/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Calendar,
    Edit,
    Filter,
    Loader2,
    MoreHorizontal,
    Plus,
    Search,
    Trash2,
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@kit/ui/dropdown-menu';
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
import { Textarea } from '@kit/ui/textarea';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
    Note,
    createNoteService,
    deleteNoteService,
    getNotesService,
    updateNoteService,
} from '~/services/activities.service';
import { getLeadsService } from '~/services/leads.service';
import { getContactsService } from '~/services/contacts.service';
import { getAccountsService } from '~/services/accounts.service';
import { getOpportunitiesService } from '~/services/opportunities.service';

export default function NotesPage() {
    const { currentWorkspace: workspace } = useRBAC();
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');
    const [entityType, setEntityType] = useState('lead');
    const [entityId, setEntityId] = useState('');

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [editContent, setEditContent] = useState('');

    const {
        data: notes = [],
        isLoading,
    } = useQuery({
        queryKey: ['notes', workspace?.id],
        queryFn: async () => {
            if (!workspace?.id) return [];
            const res = await getNotesService(workspace.id);
            return res;
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
        mutationFn: (payload: { content: string; entity_type: string; entity_id: string }) =>
            createNoteService({
                workspace_id: workspace!.id,
                entity_type: payload.entity_type,
                entity_id: payload.entity_id,
                content: payload.content,
            }),
        onSuccess: () => {
            toast.success('Note added');
            setIsCreateDialogOpen(false);
            setNewNoteContent('');
            setEntityType('lead');
            setEntityId('');
            queryClient.invalidateQueries({ queryKey: ['notes', workspace?.id] });
        },
        onError: () => toast.error('Failed to add note'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, content }: { id: string; content: string }) =>
            updateNoteService(id, { content }),
        onSuccess: () => {
            toast.success('Note updated');
            setIsEditDialogOpen(false);
            setEditingNote(null);
            queryClient.invalidateQueries({ queryKey: ['notes', workspace?.id] });
        },
        onError: () => toast.error('Failed to update note'),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteNoteService,
        onSuccess: () => {
            toast.success('Note deleted');
            queryClient.invalidateQueries({ queryKey: ['notes', workspace?.id] });
        },
        onError: () => toast.error('Failed to delete note'),
    });

    const filteredNotes = useMemo(() => {
        return notes.filter((note: Note) => {
            const matchesSearch = note.content
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

            const matchesCategory =
                categoryFilter === 'all' ||
                note.entity_type?.toLowerCase() === categoryFilter.toLowerCase();

            return matchesSearch && matchesCategory;
        });
    }, [notes, searchTerm, categoryFilter]);

    const handleEdit = (note: Note) => {
        setEditingNote(note);
        setEditContent(note.content);
        setIsEditDialogOpen(true);
    };

    const handleCreate = () => {
        if (!newNoteContent.trim() || !entityId) return;
        createMutation.mutate({ content: newNoteContent, entity_type: entityType, entity_id: entityId });
    };

    const handleUpdate = () => {
        if (!editingNote || !editContent.trim()) return;
        updateMutation.mutate({ id: editingNote.id, content: editContent });
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this note?')) {
            deleteMutation.mutate(id);
        }
    };

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
                title="Notes"
                description="Capture and organize your important thoughts and information"
            >
                <Button className="gap-2" onClick={() => {
                    setNewNoteContent('');
                    setEntityType('lead');
                    setEntityId('');
                    setIsCreateDialogOpen(true);
                }}>
                    <Plus className="h-4 w-4" />
                    New Note
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
                                        placeholder="Search notes..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <div className="flex w-full items-center gap-2 md:w-auto">
                                    <Select
                                        value={categoryFilter}
                                        onValueChange={setCategoryFilter}
                                    >
                                        <SelectTrigger className="w-full md:w-[180px]">
                                            <Filter className="mr-2 h-4 w-4" />
                                            <SelectValue placeholder="Entity Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Entities</SelectItem>
                                            <SelectItem value="lead">Leads</SelectItem>
                                            <SelectItem value="contact">Contacts</SelectItem>
                                            <SelectItem value="account">Accounts</SelectItem>
                                            <SelectItem value="opportunity">Opportunities</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes Grid */}
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                        {isLoading ? (
                            <div className="col-span-full flex h-32 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                            </div>
                        ) : filteredNotes.length > 0 ? (
                            filteredNotes.map((note: Note) => (
                                <Card
                                    key={note.id}
                                    className="group transition-all duration-200 hover:shadow-md"
                                >
                                    <CardContent className="pt-6">
                                        <div className="mb-4 flex items-start justify-between">
                                            <div className="flex items-center gap-2">
                                                {getCategoryBadge(note.entity_type)}
                                                {note.entity_name && (
                                                    <span className="text-muted-foreground text-xs truncate max-w-[120px]" title={note.entity_name}>
                                                        {note.entity_name}
                                                    </span>
                                                )}
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="transition-opacity group-hover:opacity-100 md:opacity-0"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        className="gap-2"
                                                        onClick={() => handleEdit(note)}
                                                    >
                                                        <Edit className="h-4 w-4" /> Edit Note
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="gap-2 text-red-500"
                                                        onClick={() => handleDelete(note.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" /> Delete Note
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <p className="text-muted-foreground mb-6 line-clamp-4 min-h-[5rem] whitespace-pre-wrap text-sm">
                                            {note.content}
                                        </p>
                                        <div className="border-secondary text-muted-foreground flex items-center gap-2 border-t pt-4 text-xs">
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                Updated {new Date(note.created_at).toLocaleDateString()}
                                            </span>
                                            {note.created_by_user && (
                                                <span className="ml-auto">
                                                    by {note.created_by_user.name}
                                                </span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="border-dashed flex h-32 items-center justify-center rounded-lg border-2 text-muted-foreground col-span-full">
                                {searchTerm || categoryFilter !== 'all'
                                    ? 'No notes found matching your filters.'
                                    : 'No notes found for this workspace.'}
                            </div>
                        )}
                    </div>
                </div>
            </PageBody>

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Note</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-4">
                            <Label>Associate with</Label>
                            <RadioGroup
                                value={entityType}
                                onValueChange={(val) => {
                                    setEntityType(val);
                                    setEntityId('');
                                }}
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

                            <Select value={entityId} onValueChange={setEntityId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={`Select ${entityType}...`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {entityType === 'lead' && leads?.map((lead: any) => (
                                        <SelectItem key={lead.id} value={lead.id}>
                                            {lead.first_name} {lead.last_name || ''} ({lead.company_name || 'No Company'})
                                        </SelectItem>
                                    ))}
                                    {entityType === 'contact' && contacts.map((contact: any) => (
                                        <SelectItem key={contact.id} value={contact.id}>
                                            {contact.first_name} {contact.last_name || ''}
                                        </SelectItem>
                                    ))}
                                    {entityType === 'account' && accounts.map((account: any) => (
                                        <SelectItem key={account.id} value={account.id}>
                                            {account.account_name}
                                        </SelectItem>
                                    ))}
                                    {entityType === 'opportunity' && opportunities.map((opportunity: any) => (
                                        <SelectItem key={opportunity.id} value={opportunity.id}>
                                            {opportunity.opportunity_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Note Content</Label>
                            <Textarea
                                placeholder="Enter note content..."
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                rows={6}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsCreateDialogOpen(false)}
                                disabled={createMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreate}
                                disabled={createMutation.isPending || !newNoteContent.trim() || !entityId}
                            >
                                {createMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Save Note
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>


            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Note</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <Textarea
                            placeholder="Enter note content..."
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={6}
                        />
                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsEditDialogOpen(false)}
                                disabled={updateMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleUpdate}
                                disabled={updateMutation.isPending || !editContent.trim()}
                            >
                                {updateMutation.isPending && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Update Note
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
