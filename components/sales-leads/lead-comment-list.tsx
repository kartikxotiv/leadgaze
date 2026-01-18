"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Send } from "lucide-react";
import { CommentCard } from "@/components/comments";

export interface LeadCommentListProps {
  comments: any[];
  isLoading: boolean;
  currentUser: {
    user_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  onEditComment: (commentId: string, newComment: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isDeleting: boolean;
  isEditing: boolean;
}

export function LeadCommentList({
  comments,
  isLoading,
  currentUser,
  onEditComment,
  onDeleteComment,
  isDeleting,
  isEditing,
}: LeadCommentListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-4 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
            <Send className="h-5 w-5 text-gray-400 dark:text-gray-600" />
          </div>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            No activity yet
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Start the conversation below
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {comments.map((comment) => (
        <CommentCard
          key={comment.id}
          comment={comment}
          currentUser={currentUser}
          onEdit={onEditComment}
          onDelete={onDeleteComment}
          isDeleting={isDeleting}
          isEditing={isEditing}
        />
      ))}
    </div>
  );
}
