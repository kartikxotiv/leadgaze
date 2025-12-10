"use client";

import { Plus, Upload, Calendar, FileText, Loader2 } from "lucide-react";
import { NoteDialog } from "../notes/note-dialog";
import { MeetingDialog } from "../meetings/meeting-dialog";
import { useState, useEffect, useRef } from "react";
import { useNotes, useDeleteNote, type Note } from "@/hooks/use-notes";
import {
  useMeetings,
  useDeleteMeeting,
  type Meeting,
} from "@/hooks/use-meetings";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { NoteCard } from "./note-card";
import { MediaCard, type LeadMedia } from "./media-card";
import { MeetingCard } from "./meeting-card";
import { DeleteConfirmDialog } from "@/components/common/delete-confirm-dialog";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
} from "@/components/ui/dialog";

export type TabValue = "notes" | "files" | "meetings";

export interface Tab {
  label: string;
  value: TabValue;
  icon: React.ReactNode;
}

export interface LeadTabsSectionProps {
  activeTab: TabValue;
  onTabChange: (tab: TabValue) => void;
  onNoteDialogOpen: () => void;
  previewLead: any | null;
}

export function LeadTabsSection({
  activeTab,
  onTabChange,
  onNoteDialogOpen,
  previewLead,
}: LeadTabsSectionProps) {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    null
  );
  const [mediaList, setMediaList] = useState<LeadMedia[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [isDeletingMedia, setIsDeletingMedia] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    noteId?: string;
    noteTitle?: string;
  }>({ open: false });
  const [mediaDeleteDialog, setMediaDeleteDialog] = useState<{
    open: boolean;
    mediaId?: string;
    fileName?: string;
  }>({ open: false });
  const [meetingDeleteDialog, setMeetingDeleteDialog] = useState<{
    open: boolean;
    meetingId?: string;
    meetingTitle?: string;
  }>({ open: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();

  // Notes
  const {
    data: notesData,
    isLoading: isLoadingNotes,
    refetch: refetchNotes,
  } = useNotes({
    leadId: previewLead?.id,
  });

  const deleteNoteMutation = useDeleteNote();
  const deleteMeetingMutation = useDeleteMeeting();

  const notes: Note[] = (() => {
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

  // Meetings
  const {
    data: meetingsData,
    isLoading: isLoadingMeetings,
    refetch: refetchMeetings,
  } = useMeetings({
    leadId: previewLead?.id ? String(previewLead.id) : undefined,
  });

  const meetings: Meeting[] = (() => {
    if (
      meetingsData?.data?.meetings &&
      Array.isArray(meetingsData.data.meetings)
    ) {
      return meetingsData.data.meetings;
    }
    if (Array.isArray(meetingsData?.meetings)) {
      return meetingsData.meetings;
    }
    if (Array.isArray(meetingsData?.data)) {
      return meetingsData.data;
    }
    return [];
  })();

  // Fetch Media
  const fetchMedia = async () => {
    if (!previewLead?.id) return;

    setIsLoadingMedia(true);
    try {
      const response = await fetch(`/api/lead-media?leadId=${previewLead.id}`);
      const result = await response.json();

      if (result.success) {
        setMediaList(result.data.media || []);
      } else {
        toast.error(result.error || "Failed to fetch media");
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("Failed to fetch media");
    } finally {
      setIsLoadingMedia(false);
    }
  };

  // Delete Media
  const handleDeleteMedia = async (mediaId?: string) => {
    if (!mediaId) return;

    setIsDeletingMedia(true);
    try {
      const response = await fetch(`/api/lead-media/${mediaId}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (result.success) {
        toast.success("File deleted successfully");
        await fetchMedia();
        setMediaDeleteDialog({ open: false });
      } else {
        toast.error(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting media:", error);
      toast.error("Failed to delete file");
    } finally {
      setIsDeletingMedia(false);
    }
  };

  // Handle File Upload
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (3MB limit)
    const maxSize = 3 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File size exceeds 3MB limit");
      return;
    }

    // Validate file type
    const allowedTypes = [
      "image/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/",
    ];

    const isValidType = allowedTypes.some((type) => file.type.startsWith(type));
    if (!isValidType) {
      toast.error(
        "File type not supported. Please upload images, PDFs, or documents."
      );
      return;
    }

    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("leadId", previewLead.id);
      if (user?.userId) {
        formData.append("createdBy", user.userId);
      }

      const response = await fetch("/api/lead-media/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast.success("File uploaded successfully");
        await fetchMedia();
      } else {
        toast.error(result.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploadingMedia(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    if (activeTab === "notes" && previewLead?.id) {
      refetchNotes();
    }
    if (activeTab === "files" && previewLead?.id) {
      fetchMedia();
    }
    if (activeTab === "meetings" && previewLead?.id) {
      refetchMeetings();
    }
  }, [activeTab, previewLead?.id, refetchNotes, refetchMeetings]);

  const handleNoteEdit = (note: Note) => {
    setSelectedNote(note);
    setNoteDialogOpen(true);
  };

  const handleNoteDelete = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    setDeleteDialog({
      open: true,
      noteId,
      noteTitle: note?.title || "this note",
    });
  };

  const handleConfirmDelete = async (noteId?: string) => {
    if (!noteId) return;

    try {
      await deleteNoteMutation.mutateAsync(noteId);
      toast.success("Note deleted successfully");
      setDeleteDialog({ open: false });
      refetchNotes();
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  const handleNoteDialogSuccess = () => {
    refetchNotes();
    setSelectedNote(null);
  };

  const handleMeetingEdit = (meeting: Meeting) => {
    setSelectedMeetingId(meeting.id);
    setMeetingDialogOpen(true);
  };

  const handleMeetingDelete = (meetingId: string) => {
    const meeting = meetings.find((m) => m.id === meetingId);
    setMeetingDeleteDialog({
      open: true,
      meetingId,
      meetingTitle: meeting?.title || "this meeting",
    });
  };

  const handleConfirmDeleteMeeting = async (meetingId?: string) => {
    if (!meetingId) return;

    try {
      await deleteMeetingMutation.mutateAsync(meetingId);
      toast.success("Meeting deleted successfully");
      setMeetingDeleteDialog({ open: false });
      refetchMeetings();
    } catch (error) {
      toast.error("Failed to delete meeting");
    }
  };

  const handleMeetingDialogSuccess = () => {
    refetchMeetings();
    setSelectedMeetingId(null);
  };

  const tabs: Tab[] = [
    {
      label: "Create Notes",
      value: "notes",
      icon: <Plus className="h-4 w-4" />,
    },
    {
      label: "Upload Files",
      value: "files",
      icon: <Upload className="h-4 w-4" />,
    },
    {
      label: "Create Meetings",
      value: "meetings",
      icon: <Calendar className="h-4 w-4" />,
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <ul className="flex items-center gap-2">
          {tabs.map((tab) => (
            <li
              key={tab.value}
              className={`cursor-pointer text-[14px] flex items-center gap-2 px-4 py-2 rounded-[2px] font-medium transition-colors ${
                activeTab === tab.value
                  ? "bg-blue-500 text-white"
                  : "bg-[#f4f4f4] text-gray-600 hover:bg-gray-100"
              }`}
              onClick={() => onTabChange(tab.value)}
            >
              {tab.icon}
              {tab.label}
            </li>
          ))}
        </ul>

        {/* Create Notes Button on Right */}
      </div>
      <hr className="my-0" />

      {/* Notes Tab Content */}
      {activeTab === "notes" && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Notes {notes.length > 0 && `(${notes.length})`}
            </h3>

            <button
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
              onClick={() => {
                setSelectedNote(null);
                setNoteDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create Notes
            </button>
          </div>

          {isLoadingNotes ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                No notes yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create your first note using the button above
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pb-20">
              {notes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={handleNoteEdit}
                  onDelete={handleNoteDelete}
                  isDeleting={deleteNoteMutation.isPending}
                />
              ))}
            </div>
          )}

          {previewLead?.id && (
            <>
              <NoteDialog
                open={noteDialogOpen}
                onOpenChange={(open) => {
                  setNoteDialogOpen(open);
                  if (!open) {
                    setSelectedNote(null);
                  }
                }}
                leadId={previewLead.id}
                noteId={selectedNote?.id}
                onSuccess={handleNoteDialogSuccess}
              />
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
                onConfirm={handleConfirmDelete}
                isLoading={deleteNoteMutation.isPending}
                title="Delete Note"
                description="Are you sure you want to delete this note? This action cannot be undone."
              />
            </>
          )}
        </div>
      )}

      {/* Files Tab Content */}
      {activeTab === "files" && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Files {mediaList.length > 0 && `(${mediaList.length})`}
            </h3>

            <button
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingMedia}
            >
              <Plus className="h-4 w-4" />
              {isUploadingMedia ? "Uploading..." : "Upload File"}
            </button>
          </div>

          {isLoadingMedia ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : mediaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <Upload className="h-5 w-5 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                No files yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Upload your first file using the button above
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[400px] overflow-y-auto">
              {mediaList.map((media) => (
                <MediaCard
                  key={media.id}
                  media={media}
                  onDelete={(id) => {
                    const fileName = media.media_url.split("/").pop() || "file";
                    setMediaDeleteDialog({
                      open: true,
                      mediaId: id,
                      fileName,
                    });
                  }}
                  isDeleting={isDeletingMedia}
                />
              ))}
            </div>
          )}

          {previewLead?.id && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
                disabled={isUploadingMedia}
              />
              <DeleteConfirmDialog
                open={mediaDeleteDialog.open}
                onOpenChange={(open) =>
                  setMediaDeleteDialog({
                    open,
                    mediaId: open ? mediaDeleteDialog.mediaId : undefined,
                  })
                }
                itemName={mediaDeleteDialog.fileName || "this file"}
                itemId={mediaDeleteDialog.mediaId}
                onConfirm={handleDeleteMedia}
                isLoading={isDeletingMedia}
                title="Delete File"
                description={`Are you sure you want to delete "${mediaDeleteDialog.fileName}"? This action cannot be undone.`}
              />
              <Dialog open={isUploadingMedia} onOpenChange={() => {}}>
                <DialogContent className="max-w-md">
                  <div className="flex flex-col items-center justify-center py-6">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                    <DialogDescription className="text-center">
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        Uploading File...
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Please wait while your file is being uploaded
                      </p>
                    </DialogDescription>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      )}

      {/* Meetings Tab Content */}
      {activeTab === "meetings" && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Meetings {meetings.length > 0 && `(${meetings.length})`}
            </h3>

            <button
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
              onClick={() => {
                setSelectedMeetingId(null);
                setMeetingDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Create Meeting
            </button>
          </div>

          {isLoadingMeetings ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                <Calendar className="h-5 w-5 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                No meetings yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Create your first meeting using the button above
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onEdit={handleMeetingEdit}
                  onDelete={handleMeetingDelete}
                  isDeleting={deleteMeetingMutation.isPending}
                />
              ))}
            </div>
          )}

          {previewLead?.id && (
            <>
              <MeetingDialog
                open={meetingDialogOpen}
                onOpenChange={(open) => {
                  setMeetingDialogOpen(open);
                  if (!open) {
                    setSelectedMeetingId(null);
                  }
                }}
                leadId={previewLead.id}
                meetingId={selectedMeetingId || undefined}
                onSuccess={handleMeetingDialogSuccess}
              />
              <DeleteConfirmDialog
                open={meetingDeleteDialog.open}
                onOpenChange={(open) =>
                  setMeetingDeleteDialog({
                    open,
                    meetingId: open ? meetingDeleteDialog.meetingId : undefined,
                    meetingTitle: open
                      ? meetingDeleteDialog.meetingTitle
                      : undefined,
                  })
                }
                itemName={meetingDeleteDialog.meetingTitle || "this meeting"}
                itemId={meetingDeleteDialog.meetingId}
                onConfirm={handleConfirmDeleteMeeting}
                isLoading={deleteMeetingMutation.isPending}
                title="Delete Meeting"
                description={`Are you sure you want to delete "${meetingDeleteDialog.meetingTitle}"? This action cannot be undone.`}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
