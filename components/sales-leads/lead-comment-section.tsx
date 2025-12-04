"use client";

import { LeadCommentHeader } from "./lead-comment-header";
import { LeadCommentList } from "./lead-comment-list";
import { LeadCommentInput } from "./lead-comment-input";

export interface LeadCommentSectionProps {
  leadId: string | null;
  comments: any[];
  isLoading: boolean;
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

export function LeadCommentSection({
  leadId,
  comments,
  isLoading,
  currentUser,
  newCommentText,
  onCommentTextChange,
  onAddComment,
  onEditComment,
  onDeleteComment,
  isSubmitting,
  isDeleting,
  isEditing,
}: LeadCommentSectionProps) {
  return (
    <div className="border-l border-gray-200 dark:border-gray-800 bg-[#f8fafc] dark:bg-gray-950 w-80 lg:w-96 flex-shrink-0 flex flex-col">
      <LeadCommentHeader
        commentsCount={comments.length}
        isLoading={isLoading}
      />

      <LeadCommentList
        comments={comments}
        isLoading={isLoading}
        currentUser={currentUser}
        onEditComment={onEditComment}
        onDeleteComment={onDeleteComment}
        isDeleting={isDeleting}
        isEditing={isEditing}
      />

      <LeadCommentInput
        leadId={leadId}
        currentUser={currentUser}
        value={newCommentText}
        onChange={onCommentTextChange}
        onSubmit={onAddComment}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
