"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { LeadDetailsSection } from "./lead-details-section";
import { LeadCommentSection } from "./lead-comment-section";
import type { FormData } from "@/lib/constants/sales-leads";
import type { LeadPriority } from "@/lib/data/lead-priorities";
import type { ContactPlatform } from "@/lib/data/contact-platforms";

export interface EditLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewLead: any | null;
  previewLeadDisplayName: string;
  isLoadingPreview: boolean;
  editFormData: FormData;
  statusLabel: string;
  statusClassName: string;
  priorityOptions: LeadPriority[];
  platformOptions: ContactPlatform[];
  platformsLoading: boolean;
  onEditFormChange: <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => void;
  onEditPlatformSelectChange: (value: string) => void;
  onEditPrioritySelectChange: (value: string) => void;
  onAddPlatformClick: () => void;
  onNoteDialogOpen: () => void;
  onMediaDialogOpen: () => void;
  upcomingMeetings: any[];
  meetingsLoading: boolean;
  onMeetingCreate: () => void;
  onMeetingClick: (meetingId: string) => void;
  onMeetingEdit: (meetingId: string) => void;
  onMeetingDelete: (meetingId: string, meetingTitle: string) => void;
  onCancel: () => void;
  onUpdate: () => void;
  isUpdating: boolean;
  // Comment section props
  leadComments: any[];
  leadCommentsLoading: boolean;
  currentUser: {
    user_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  newCommentText: string;
  onCommentTextChange: (text: string) => void;
  onAddComment: () => void;
  onEditComment: (commentId: string, newComment: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isSubmitting: boolean;
  isDeleting: boolean;
  isEditing: boolean;
}

export function EditLeadDialog({
  open,
  onOpenChange,
  previewLead,
  previewLeadDisplayName,
  isLoadingPreview,
  editFormData,
  statusLabel,
  statusClassName,
  priorityOptions,
  platformOptions,
  platformsLoading,
  onEditFormChange,
  onEditPlatformSelectChange,
  onEditPrioritySelectChange,
  onAddPlatformClick,
  onNoteDialogOpen,
  onMediaDialogOpen,
  upcomingMeetings,
  meetingsLoading,
  onMeetingCreate,
  onMeetingClick,
  onMeetingEdit,
  onMeetingDelete,
  onCancel,
  onUpdate,
  isUpdating,
  leadComments,
  leadCommentsLoading,
  currentUser,
  newCommentText,
  onCommentTextChange,
  onAddComment,
  onEditComment,
  onDeleteComment,
  isSubmitting,
  isDeleting,
  isEditing,
}: EditLeadDialogProps) {
  if (!previewLead) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl p-0">
          <div className="py-12 text-center text-muted-foreground text-sm">
            Select a sales lead to view details.
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-[90%] p-0">
        <div className="sr-only">
          <DialogTitle>{previewLeadDisplayName || "Lead Details"}</DialogTitle>
        </div>
        <div className="bg-white rounded-lg shadow-xl min-w-[80%] h-[90vh] overflow-hidden flex flex-col relative">
          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 relative">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-0">
                    {previewLeadDisplayName}
                  </h1>
                </div>
              </div>

              <LeadDetailsSection
                previewLead={previewLead}
                isLoadingPreview={isLoadingPreview}
                editFormData={editFormData}
                statusLabel={statusLabel}
                statusClassName={statusClassName}
                priorityOptions={priorityOptions}
                platformOptions={platformOptions}
                platformsLoading={platformsLoading}
                onEditFormChange={onEditFormChange}
                onEditPlatformSelectChange={onEditPlatformSelectChange}
                onEditPrioritySelectChange={onEditPrioritySelectChange}
                onAddPlatformClick={onAddPlatformClick}
                onNoteDialogOpen={onNoteDialogOpen}
                onMediaDialogOpen={onMediaDialogOpen}
                upcomingMeetings={upcomingMeetings}
                meetingsLoading={meetingsLoading}
                onMeetingCreate={onMeetingCreate}
                onMeetingClick={onMeetingClick}
                onMeetingEdit={onMeetingEdit}
                onMeetingDelete={onMeetingDelete}
                onCancel={onCancel}
                onUpdate={onUpdate}
                isUpdating={isUpdating}
              />
            </div>

            <LeadCommentSection
              leadId={previewLead?.id ?? null}
              comments={leadComments}
              isLoading={leadCommentsLoading}
              currentUser={currentUser}
              newCommentText={newCommentText}
              onCommentTextChange={onCommentTextChange}
              onAddComment={onAddComment}
              onEditComment={onEditComment}
              onDeleteComment={onDeleteComment}
              isSubmitting={isSubmitting}
              isDeleting={isDeleting}
              isEditing={isEditing}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
