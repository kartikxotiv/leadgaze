'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, MessageSquare, Pencil, Plus, Trash2 } from 'lucide-react';
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
import { Textarea } from '@kit/ui/textarea';

import { useHasPermission } from '~/lib/permissions/use-permissions';
import { useRBAC } from '~/lib/rbac/rbac-provider';

import {
  Note,
  createNoteService,
  deleteNoteService,
  getNotesService,
  updateNoteService,
} from '../../../services/activities.service';

interface EntityNotesProps {
  entityType: string;
  entityId: string;
}

export function EntityNotes({ entityType, entityId }: EntityNotesProps) {
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

  const canAddNote = useHasPermission(moduleKey, 'add_note');
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);

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
      queryClient.invalidateQueries({
        queryKey: ['notes', workspace?.id],
      });
    },
    onError: () => toast.error('Failed to add note'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      updateNoteService(id, { content }),
    onSuccess: () => {
      toast.success('Note updated');
      setIsOpen(false);
      setEditingNote(null);
      setNewNoteContent('');
      queryClient.invalidateQueries({
        queryKey: ['notes', entityType, entityId],
      });
      queryClient.invalidateQueries({
        queryKey: ['notes', workspace?.id],
      });
    },
    onError: () => toast.error('Failed to update note'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteNoteService,
    onSuccess: () => {
      toast.success('Note deleted');
      queryClient.invalidateQueries({
        queryKey: ['notes', entityType, entityId],
      });
      queryClient.invalidateQueries({
        queryKey: ['notes', workspace?.id],
      });
    },
    onError: () => toast.error('Failed to delete note'),
  });

  const handleSave = () => {
    if (!newNoteContent.trim()) return;
    if (editingNote) {
      updateMutation.mutate({ id: editingNote.id, content: newNoteContent });
    } else {
      createMutation.mutate(newNoteContent);
    }
  };

  const openEditDialog = (note: Note) => {
    setEditingNote(note);
    setNewNoteContent(note.content);
    setIsOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-gray-400" />
          <CardTitle className="text-lg">Notes</CardTitle>
        </div>
        {canAddNote && (
          <Dialog
            open={isOpen}
            onOpenChange={(open) => {
              setIsOpen(open);
              if (!open) {
                setEditingNote(null);
                setNewNoteContent('');
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost" className="gap-1 text-xs">
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingNote ? 'Edit Note' : 'Add Note'}
                </DialogTitle>
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
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={
                      createMutation.isPending || updateMutation.isPending
                    }
                  >
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingNote ? 'Update Note' : 'Save Note'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note: Note) => (
              <div key={note.id}>
                <div className="group relative rounded-lg border border-gray-100 bg-gray-50 p-3 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:bg-slate-900 dark:hover:bg-slate-800">
                  <p
                    className="cursor-pointer pr-12 text-sm whitespace-pre-wrap text-gray-700 dark:text-gray-300"
                    onClick={() => openEditDialog(note)}
                  >
                    {note.content}
                  </p>
                  <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex flex-wrap gap-2">
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                      {note.created_by_user && (
                        <span>by {note.created_by_user.name}</span>
                      )}
                      {note.entity_name && note.entity_type !== entityType && (
                        <span className="text-blue-600 dark:text-blue-400">
                          from {note.entity_type}: {note.entity_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => openEditDialog(note)}
                      className="p-1 text-gray-400 hover:text-blue-500"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm('Are you sure you want to delete this note?')
                        ) {
                          deleteMutation.mutate(note.id);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
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
