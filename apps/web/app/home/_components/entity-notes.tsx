'use client';

import { useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, Plus, Trash2 } from 'lucide-react';
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
import { Separator } from '@kit/ui/separator';
import { Textarea } from '@kit/ui/textarea';

import { useRBAC } from '~/lib/rbac/rbac-provider';
import {
    createNoteService,
    deleteNoteService,
    getNotesService,
    Note,
} from '../../../services/activities.service';

interface EntityNotesProps {
    entityType: string;
    entityId: string;
}

export function EntityNotes({ entityType, entityId }: EntityNotesProps) {
    const { currentWorkspace: workspace } = useRBAC();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');

    const { data: notes = [], isLoading } = useQuery({
        queryKey: ['notes', entityType, entityId],
        queryFn: () => {
            if (!workspace?.id) return [];
            return getNotesService(workspace.id, entityType, entityId);
        },
        enabled: !!workspace?.id,
    });

    const createMutation = useMutation({
        mutationFn: (content: string) =>
            createNoteService({
                workspace_id: workspace!.id,
                entity_type: entityType,
                entity_id: entityId,
                content,
            }),
        onSuccess: () => {
            toast.success('Note added');
            setIsOpen(false);
            setNewNoteContent('');
            queryClient.invalidateQueries({
                queryKey: ['notes', entityType, entityId],
            });
        },
        onError: () => toast.error('Failed to add note'),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteNoteService,
        onSuccess: () => {
            toast.success('Note deleted');
            queryClient.invalidateQueries({
                queryKey: ['notes', entityType, entityId],
            });
        },
        onError: () => toast.error('Failed to delete note'),
    });

    const handleCreate = () => {
        if (!newNoteContent.trim()) return;
        createMutation.mutate(newNoteContent);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                    <CardTitle className="text-lg">Notes</CardTitle>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs">
                            <Plus className="h-3 w-3" />
                            Add
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Note</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <Textarea
                                placeholder="Enter note content..."
                                value={newNoteContent}
                                onChange={(e) => setNewNoteContent(e.target.value)}
                                rows={4}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsOpen(false)}
                                    disabled={createMutation.isPending}
                                >
                                    Cancel
                                </Button>
                                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                    {createMutation.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    )}
                                    Save Note
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : notes.length > 0 ? (
                    <div className="space-y-4">
                        {notes.map((note: Note, index: number) => (
                            <div key={note.id}>
                                <div className="group relative rounded-lg border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100 dark:border-gray-800 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors">
                                    <p className="text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300 pr-6">
                                        {note.content}
                                    </p>
                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                                        <div className="flex gap-2">
                                            <span>{new Date(note.created_at).toLocaleString()}</span>
                                            {note.created_by_user && (
                                                <span>by {note.created_by_user.name}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this note?')) {
                                                deleteMutation.mutate(note.id)
                                            }
                                        }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-red-500"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <MessageSquare className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                        <p className="text-sm text-gray-500">No notes yet</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
