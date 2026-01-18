"use client";

import { CommentInput } from "@/components/comments";

export interface LeadCommentInputProps {
  leadId: string | null;
  currentUser: {
    user_id?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function LeadCommentInput({
  leadId,
  currentUser,
  value,
  onChange,
  onSubmit,
  isSubmitting,
}: LeadCommentInputProps) {
  return (
    <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
      <CommentInput
        currentUser={currentUser}
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        disabled={!leadId}
        placeholder="Add a comment..."
      />
    </div>
  );
}
