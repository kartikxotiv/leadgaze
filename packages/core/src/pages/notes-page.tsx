'use client';

import React, { useMemo, useState } from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit, Plus, Search, Trash2 } from 'lucide-react';
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
import { Input } from '@kit/ui/input';
import { Label } from '@kit/ui/label';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Textarea } from '@kit/ui/textarea';

import {
  createNoteService,
  deleteNoteService,
  getNotesService,
  updateNoteService,
} from '../services';
import type { CoreNote } from '../types';
import { formatCoreDateTime } from '../utils';

type CoreNotesPageProps = {
  workspaceId: string;
};

type NoteFormState = {
  note: string;
  entity_type: string;
  entity_id: string;
};

const emptyForm: NoteFormState = {
  note: '',
  entity_type: '',
  entity_id: '',
};

export function CoreNotesPage({ workspaceId }: CoreNotesPageProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<NoteFormState>(emptyForm);
  const [editingNote, setEditingNote] = useState<CoreNote | null>(null);
  const [editText, setEditText] = useState('');

  const queryKey = ['core', 'notes', workspaceId];

  const { data: notes = [], isLoading } = useQuery<CoreNote[]>({
    queryKey,
    queryFn: () => getNotesService(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: createNoteService,
    onSuccess: () => {
      toast.success('Note created');
      setForm(emptyForm);
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Failed to create note'),
  });

  const updateMutation = useMutation({
    mutationFn: updateNoteService,
    onSuccess: () => {
      toast.success('Note updated');
      setEditingNote(null);
      setEditText('');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Failed to update note'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNoteService(workspaceId, id),
    onSuccess: () => {
      toast.success('Note deleted');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error('Failed to delete note'),
  });

  const entityTypes = useMemo(() => {
    return Array.from(
      new Set(notes.map((note) => note.entity_type).filter(Boolean)),
    ).sort();
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedType = entityTypeFilter.trim().toLowerCase();

    return notes.filter((note) => {
      const matchesType =
        !normalizedType || note.entity_type?.toLowerCase() === normalizedType;
      const matchesSearch =
        !normalizedSearch ||
        note.note.toLowerCase().includes(normalizedSearch) ||
        note.entity_type?.toLowerCase().includes(normalizedSearch) ||
        note.entity_id?.toLowerCase().includes(normalizedSearch) ||
        note.relations.some(
          (relation) =>
            relation.entity_type.toLowerCase().includes(normalizedSearch) ||
            relation.entity_id.toLowerCase().includes(normalizedSearch),
        );

      return matchesType && matchesSearch;
    });
  }, [entityTypeFilter, notes, search]);

  const canCreate =
    form.note.trim() && form.entity_type.trim() && form.entity_id.trim();

  return (
    <>
      <PageHeader
        title="Notes"
        description="Create and review reusable Core notes across any workspace entity."
      />

      <PageBody className="grid gap-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              className="pl-9"
              placeholder="Search by note, entity type, or entity id"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              list="core-note-entity-types"
              placeholder="Filter entity type"
              value={entityTypeFilter}
              onChange={(event) => setEntityTypeFilter(event.target.value)}
            />
            <datalist id="core-note-entity-types">
              {entityTypes.map((entityType) => (
                <option key={entityType} value={entityType ?? ''} />
              ))}
            </datalist>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Note
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <EmptyState message="Loading notes..." />
            ) : filteredNotes.length === 0 ? (
              <EmptyState message="No notes found." />
            ) : (
              <div className="divide-y">
                {filteredNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onEdit={() => {
                      setEditingNote(note);
                      setEditText(note.note);
                    }}
                    onDelete={() => deleteMutation.mutate(note.id)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </PageBody>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Core Note</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <p className="text-muted-foreground text-sm">
              Core notes attach to any feature through an entity type and entity
              id. For example, use `fundraising_deal` with a deal id.
            </p>
            <Field label="Entity Type">
              <Input
                placeholder="fundraising_deal"
                value={form.entity_type}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    entity_type: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Entity ID">
              <Input
                placeholder="UUID of the related entity"
                value={form.entity_id}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, entity_id: event.target.value }))
                }
              />
            </Field>
            <Field label="Note">
              <Textarea
                placeholder="Write the note"
                value={form.note}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, note: event.target.value }))
                }
              />
            </Field>
            <div className="flex justify-end">
              <Button
                disabled={!canCreate || createMutation.isPending}
                onClick={() =>
                  createMutation.mutate({
                    workspace_id: workspaceId,
                    entity_type: form.entity_type.trim(),
                    entity_id: form.entity_id.trim(),
                    note: form.note.trim(),
                  })
                }
              >
                Create Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingNote)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingNote(null);
            setEditText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Note</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Field label="Note">
              <Textarea
                value={editText}
                onChange={(event) => setEditText(event.target.value)}
              />
            </Field>
            <div className="flex justify-end">
              <Button
                disabled={!editingNote || !editText.trim() || updateMutation.isPending}
                onClick={() =>
                  editingNote &&
                  updateMutation.mutate({
                    id: editingNote.id,
                    workspace_id: workspaceId,
                    note: editText.trim(),
                  })
                }
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NoteRow({
  note,
  onEdit,
  onDelete,
}: {
  note: CoreNote;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {(note.relations.length > 0 ? note.relations : []).map((relation) => (
            <Badge key={relation.id} variant="outline">
              {relation.entity_type}: {relation.entity_id}
            </Badge>
          ))}
          {note.relations.length === 0 && (
            <span className="text-muted-foreground text-xs">No relations</span>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm">{note.note}</p>
        <p className="text-muted-foreground mt-2 text-xs">
          Updated {formatCoreDateTime(note.updated_at)} · Created{' '}
          {formatCoreDateTime(note.created_at)}
        </p>
      </div>
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="text-muted-foreground p-6 text-sm">{message}</div>;
}
