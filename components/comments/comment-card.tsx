"use client";

import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Trash2, Edit2, X, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface CommentData {
  id: string;
  comment: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lead_id: string;
  created_by_user?: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

export interface CommentUser {
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface CommentCardProps {
  comment: CommentData;
  currentUser?: CommentUser;
  onDelete?: (commentId: string) => void;
  onEdit?: (commentId: string, newComment: string) => void;
  onReply?: (commentId: string) => void;
  isDeleting?: boolean;
  isEditing?: boolean;
  className?: string;
}

/**
 * Get initials from name or email
 */
function getInitials(name?: string, email?: string): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (
        parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
      ).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return "?";
}

/**
 * Get consistent color for a user
 */
function getUserColor(identifier: string): string {
  const colors = [
    "bg-orange-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-yellow-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-teal-500",
  ];

  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = identifier.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Format timestamp to relative time
 */
function formatTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: false });
    }

    // Format as "Oct 13 at 5:27 pm"
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

/**
 * Modern comment card component matching the UI design
 */
export function CommentCard({
  comment,
  currentUser,
  onDelete,
  onEdit,
  onReply,
  isDeleting = false,
  isEditing: externalIsEditing = false,
  className,
}: CommentCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.comment);
  const [isSaving, setIsSaving] = useState(false);

  // Update editText when comment changes (e.g., after successful edit)
  useEffect(() => {
    if (!isEditing) {
      setEditText(comment.comment);
    }
  }, [comment.comment, isEditing]);

  // Get user display name
  const userName = comment.created_by_user
    ? `${comment.created_by_user.first_name} ${comment.created_by_user.last_name}`.trim()
    : "Unknown User";

  const userEmail = comment.created_by_user?.email;
  const initials = getInitials(userName, userEmail);
  const colorClass = getUserColor(comment.created_by || userName);
  const timestamp = formatTimestamp(comment.created_at);

  const canEdit = currentUser && comment.created_by === currentUser.user_id;
  const canDelete = currentUser && comment.created_by === currentUser.user_id;
  const editing = isEditing || externalIsEditing;

  const handleEdit = () => {
    setIsEditing(true);
    setEditText(comment.comment);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditText(comment.comment);
  };

  const handleSave = async () => {
    if (!editText.trim()) {
      return;
    }
    if (onEdit) {
      setIsSaving(true);
      try {
        await onEdit(comment.id, editText.trim());
        setIsEditing(false);
      } catch (error) {
        // Error handling is done by parent component
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div
      className={cn(
        "group bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors",
        className
      )}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src="" alt={userName} />
          <AvatarFallback
            className={cn(colorClass, "text-white font-medium text-sm")}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                {userName}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {timestamp}
              </span>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {canEdit && onEdit && !editing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleEdit}
                  disabled={isDeleting || isSaving}
                >
                  <Edit2 className="h-3.5 w-3.5 text-gray-500 hover:text-blue-600" />
                </Button>
              )}
              {canDelete && onDelete && !editing && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onDelete(comment.id)}
                  disabled={isDeleting || isSaving}
                >
                  <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-600" />
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="space-y-2">
            {editing ? (
              <div className="space-y-2">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[80px] text-sm resize-none"
                  disabled={isSaving}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleSave}
                    disabled={
                      isSaving ||
                      !editText.trim() ||
                      editText.trim() === comment.comment
                    }
                    className="h-7 px-3"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="h-7 px-3"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
                  {comment.comment}
                </p>

                {/* Parse and display duration if present */}
                {comment.comment.toLowerCase().includes("hour") && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {comment.comment.match(/\d+\s*hour/i)?.[0]}
                  </div>
                )}
              </>
            )}
          </div>

          {/* <div className="flex items-center gap-4 mt-3">
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={cn(
                "flex items-center gap-1.5 text-xs transition-colors",
                isLiked
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <ThumbsUp
                className={cn(
                  "h-4 w-4",
                  isLiked && "fill-current"
                )}
              />
            </button>

            {onReply && (
              <button
                onClick={() => onReply(comment.id)}
                className="ml-auto text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                Reply
              </button>
            )}
          </div> */}
        </div>
      </div>
    </div>
  );
}
