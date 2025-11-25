"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useNotes,
  type CreateNoteData,
  type Note,
} from "@/hooks/use-notes";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { Loader2, FileText, Edit, Trash2, Plus, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { DeleteConfirmDialog } from "@/components/common/delete-confirm-dialog";

interface NoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  noteId?: string;
  onSuccess?: () => void;
}

function formatTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    return (
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }) +
      " at " +
      date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  } catch (error) {
    return "Recently";
  }
}

function NoteCard({
  note,
  onEdit,
  onDelete,
  isDeleting,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
  isDeleting?: boolean;
}) {
  const timestamp = formatTimestamp(note.createdAt);

  return (
    <Card
      className="group hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onEdit(note)}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarFallback className="bg-blue-500 text-white font-medium text-sm">
              <FileText className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {note.title}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {timestamp}
                </span>
              </div>
              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(note)}
                >
                  <Edit className="h-3.5 w-3.5 text-gray-500 hover:text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onDelete(note.id)}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-600" />
                </Button>
              </div>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed line-clamp-3">
              {note.description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function NoteDialog({
  open,
  onOpenChange,
  leadId,
  noteId,
  onSuccess,
}: NoteDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [viewNotesModalOpen, setViewNotesModalOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    noteId?: string;
    noteTitle?: string;
  }>({ open: false });

  const { currentWorkspace } = useWorkspaceContext();
  const isEditMode = !!selectedNote;

  const {
    data: notesData,
    isLoading: isLoadingNotes,
    refetch: refetchNotes,
  } = useNotes({
    leadId,
  });

  const createNoteMutation = useCreateNote();
  const updateNoteMutation = useUpdateNote();
  const deleteNoteMutation = useDeleteNote();

  const notes: Note[] = (() => {
    if (notesData && process.env.NODE_ENV === "development") {
      console.log("Notes data structure:", notesData);
    }

    if (notesData?.data?.notes && Array.isArray(notesData.data.notes)) {
      return notesData.data.notes;
    }
    if (Array.isArray(notesData?.notes)) {
      return notesData.notes;
    }
    if (Array.isArray(notesData?.data)) {
      return notesData.data;
    }
    return [];
  })();

  useEffect(() => {
    if (open && leadId) {
      refetchNotes();
    } else if (!open) {
      setTitle("");
      setDescription("");
      setSelectedNote(null);
    }
  }, [open, leadId, refetchNotes]);

  useEffect(() => {
    if (viewNotesModalOpen && leadId) {
      refetchNotes();
    }
  }, [viewNotesModalOpen, leadId, refetchNotes]);

  const handleEdit = (note: Note) => {
    setSelectedNote(note);
    setTitle(note.title);
    setDescription(note.description);
    setViewNotesModalOpen(false);
  };

  const handleCancelEdit = () => {
    setSelectedNote(null);
    setTitle("");
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }

    if (!currentWorkspace?.id) {
      toast.error("No workspace selected");
      return;
    }

    try {
      if (isEditMode && selectedNote) {
        await updateNoteMutation.mutateAsync({
          noteId: selectedNote.id,
          data: {
            title: title.trim(),
            description: description.trim(),
          },
        });
        toast.success("Note updated successfully");
      } else {
        await createNoteMutation.mutateAsync({
          leadId,
          title: title.trim(),
          description: description.trim(),
          workspaceId: currentWorkspace.id,
        });
        toast.success("Note created successfully");
      }

      handleCancelEdit();
      await refetchNotes();
      onSuccess?.();
    } catch (error) {}

    handleClose();
  };

  const handleDelete = async (noteIdToDelete?: string) => {
    if (!noteIdToDelete) return;

    try {
      await deleteNoteMutation.mutateAsync(noteIdToDelete);
      toast.success("Note deleted successfully");
      setDeleteDialog({ open: false });
      await refetchNotes();
      onSuccess?.();
    } catch (error) {}
  };

  const handleClose = () => {
    if (
      !createNoteMutation.isPending &&
      !updateNoteMutation.isPending &&
      !deleteNoteMutation.isPending
    ) {
      handleCancelEdit();
      onOpenChange(false);
    }
  };

  const isLoading =
    createNoteMutation.isPending ||
    updateNoteMutation.isPending ||
    deleteNoteMutation.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 [&>button]:hidden">
          <DialogHeader className="px-4 pt-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </DialogTitle>
                <DialogDescription>
                  Manage notes for this lead. View existing notes or create new
                  ones.
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewNotesModalOpen(true)}
                className="flex items-center gap-2"
              >
                View Notes{" "}
                <span className="text-sm text-red-500 ">{notes.length}</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {isEditMode ? "Edit Note" : "Create New Note"}
              </h3>
              {isEditMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelEdit}
                  className="text-sm"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  New Note
                </Button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note-title">Title *</Label>
                <Input
                  id="note-title"
                  placeholder="Enter note title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isLoading}
                  maxLength={255}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="note-description">Description *</Label>
                <Textarea
                  id="note-description"
                  placeholder="Enter note description..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                  rows={10}
                  required
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleClose()}
                  // disabled={isLoading}
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !title.trim() || !description.trim()}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditMode ? "Update Note" : "Create Note"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewNotesModalOpen} onOpenChange={setViewNotesModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              View Notes
            </DialogTitle>
            <DialogDescription>
              Click on a note to edit it or use the actions to manage notes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingNotes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No notes yet
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Create your first note in the main dialog
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note: Note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={handleEdit}
                    onDelete={(id) =>
                      setDeleteDialog({
                        open: true,
                        noteId: id,
                        noteTitle: note.title,
                      })
                    }
                    isDeleting={deleteNoteMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) =>
          setDeleteDialog({
            open,
            noteId: open ? deleteDialog.noteId : undefined,
          })
        }
        itemName={deleteDialog.noteTitle || "this note"}
        itemId={deleteDialog.noteId}
        onConfirm={handleDelete}
        isLoading={deleteNoteMutation.isPending}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
      />
    </>
  );
}
