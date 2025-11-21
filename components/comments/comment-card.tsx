"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ThumbsUp, Trash2 } from "lucide-react";
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
  onReply?: (commentId: string) => void;
  isDeleting?: boolean;
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
  onReply,
  isDeleting = false,
  className,
}: CommentCardProps) {
  const [isLiked, setIsLiked] = useState(false);

  // Get user display name
  const userName = comment.created_by_user
    ? `${comment.created_by_user.first_name} ${comment.created_by_user.last_name}`.trim()
    : "Unknown User";

  const userEmail = comment.created_by_user?.email;
  const initials = getInitials(userName, userEmail);
  const colorClass = getUserColor(comment.created_by || userName);
  const timestamp = formatTimestamp(comment.created_at);

  const canDelete = currentUser && comment.created_by === currentUser.user_id;

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
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onDelete(comment.id)}
                disabled={isDeleting}
              >
                <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-600" />
              </Button>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed">
              {comment.comment}
            </p>

            {/* Parse and display duration if present */}
            {comment.comment.toLowerCase().includes("hour") && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {comment.comment.match(/\d+\s*hour/i)?.[0]}
              </div>
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
