'use client';

import { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Pencil, Plus, Trash2, Check, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@kit/ui/button';
import { CardWidgetContainer } from '@kit/ui/card-widget-container';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Textarea } from '@kit/ui/textarea';

import { useLocalization } from '~/lib/localization/localization-provider';
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
  const { formatDate } = useLocalization();
  const [statusFilter, setStatusFilter] = useState<'active' | 'closed'>('active');

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
    queryKey: ['notes', entityType, entityId, workspace?.id, statusFilter],
    queryFn: () => {
      if (!workspace?.id) return [];
      return getNotesService(workspace.id, entityType, entityId, statusFilter);
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
        queryKey: ['notes', entityType, entityId, workspace?.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['notes', workspace?.id],
      });
    },
    onError: () => toast.error('Failed to add note'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, content, is_closed }: { id: string; content?: string; is_closed?: boolean }) =>
      updateNoteService(id, { content, is_closed }),
    onSuccess: (data, variables) => {
      if (variables.is_closed !== undefined) {
        toast.success(variables.is_closed ? 'Note closed' : 'Note reopened');
      } else {
        toast.success('Note updated');
      }
      setIsOpen(false);
      setEditingNote(null);
      setNewNoteContent('');
      queryClient.invalidateQueries({
        queryKey: ['notes', entityType, entityId, workspace?.id],
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
        queryKey: ['notes', entityType, entityId, workspace?.id],
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
    <CardWidgetContainer
      title="Notes"
      hideHeaderBorder={true}
      icon={<FileText className="text-leadgaze-dark h-5 w-5 dark:text-white" />}
      icon2={
        canAddNote ? (
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
              <Button
                size="sm"
                variant="ghost"
                className="gap-1 text-sm text-blue-500 hover:text-blue-600"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[90vh] flex-col p-0">
              <DialogHeader className="border-b p-6 pb-4">
                <DialogTitle>
                  {editingNote ? 'Edit Note' : 'Add Note'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 px-6 pb-4">
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
        ) : null
      }
    >
      <div className="px-6 py-3">
        {/* Compact Toggle Filter */}
        <div className="flex bg-gray-100/60 dark:bg-gray-800/60 p-0.5 rounded-lg mb-4 w-fit border border-gray-200/20">
          <button
            onClick={() => setStatusFilter('active')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
              statusFilter === 'active'
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('closed')}
            className={`rounded px-2.5 py-1 text-[11px] font-medium transition-all ${
              statusFilter === 'closed'
                ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Closed
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : notes.length > 0 ? (
          /* Clean CRM vertical activity timeline thread */
          <div className="relative border-l border-gray-200 dark:border-gray-800 ml-2.5 pl-4 space-y-5 py-1">
            {notes.map((note: Note) => (
              <div key={note.id} className="relative group">
                {/* Timeline Dot Indicator */}
                <div className={`absolute -left-[22.5px] top-1.5 h-2 w-2 rounded-full border border-white dark:border-gray-950 ${
                  note.is_closed
                    ? 'bg-gray-300 dark:bg-gray-700'
                    : 'bg-blue-500'
                }`} />

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {note.created_by_user?.name || 'Unknown User'}
                      </span>
                      <span className="text-gray-300 dark:text-gray-700">•</span>
                      <span className="text-gray-400 dark:text-gray-500">
                        {formatDate(note.created_at)}
                      </span>
                    </div>

                    {/* Compact Hover Actions */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {statusFilter === 'active' ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateMutation.mutate({ id: note.id, is_closed: true })}
                          className="h-6 w-6 rounded text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Close Note"
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateMutation.mutate({ id: note.id, is_closed: false })}
                          className="h-6 w-6 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                          title="Reopen Note"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(note)}
                        className="h-6 w-6 rounded text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Edit Note"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this note?')) {
                            deleteMutation.mutate(note.id);
                          }
                        }}
                        className="h-6 w-6 rounded text-gray-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Delete Note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <p
                    className={`cursor-pointer text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap ${
                      note.is_closed
                        ? 'text-gray-400 line-through dark:text-gray-500'
                        : ''
                    }`}
                    onClick={() => openEditDialog(note)}
                  >
                    {note.content}
                  </p>

                  {/* Context origin tags */}
                  {note.entity_type !== entityType && (
                    <div className="pt-0.5">
                      <span className="inline-block rounded bg-gray-100 dark:bg-gray-800/80 px-1.5 py-0.5 text-[9px] font-medium text-gray-500 dark:text-gray-400">
                        {note.entity_type.charAt(0).toUpperCase() + note.entity_type.slice(1)}
                        {note.entity_name ? `: ${note.entity_name}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center">
            <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300 dark:text-gray-700" />
            <p className="text-xs text-gray-400 dark:text-gray-500">No notes yet</p>
          </div>
        )}
      </div>
    </CardWidgetContainer>
  );
}
