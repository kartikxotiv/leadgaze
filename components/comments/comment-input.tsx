"use client";

import React, { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Send, Loader2, Paperclip, AtSign, Smile } from "lucide-react";

export interface CommentInputUser {
  user_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

interface CommentInputProps {
  currentUser?: CommentInputUser;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Get initials from user
 */
function getUserInitials(user?: CommentInputUser): string {
  if (!user) return "?";

  const firstName = user.first_name || "";
  const lastName = user.last_name || "";

  if (firstName && lastName) {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }
  if (firstName) return firstName.charAt(0).toUpperCase();
  if (user.email) return user.email.charAt(0).toUpperCase();
  return "?";
}

/**
 * Get user color
 */
function getUserColor(user?: CommentInputUser): string {
  if (!user || !user.user_id) return "bg-gray-500";

  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-indigo-500",
  ];

  let hash = 0;
  for (let i = 0; i < user.user_id.length; i++) {
    hash = user.user_id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function CommentInput({
  currentUser,
  value,
  onChange,
  onSubmit,
  isSubmitting = false,
  disabled = false,
  placeholder = "Add a comment...",
  className,
}: CommentInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (value.trim() && !isSubmitting && !disabled) {
        onSubmit();
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Use setTimeout to allow button clicks to register before losing focus
    setTimeout(() => {
      const relatedTarget = e.relatedTarget as HTMLElement;
      const isClickingInsideActions = relatedTarget?.closest(
        ".comment-actions-bar"
      );
      if (!isClickingInsideActions) {
        setIsFocused(false);
      }
    }, 100);
  };

  const initials = getUserInitials(currentUser);
  const colorClass = getUserColor(currentUser);
  const canSubmit = value.trim().length > 0 && !isSubmitting && !disabled;

  return (
    <div className={cn("space-y-3", className)}>
      <div
        className={cn(
          "flex gap-3 p-3 rounded-lg border-2 transition-colors bg-white dark:bg-gray-950",
          isFocused
            ? "border-purple-500 dark:border-purple-400"
            : "border-gray-200 dark:border-gray-800"
        )}
      >
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0 mt-1">
          <AvatarImage src="" alt={currentUser?.first_name || "User"} />
          <AvatarFallback
            className={cn(colorClass, "text-white font-medium text-xs")}
          >
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Input Area */}
        <div className="flex-1 min-w-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled || isSubmitting}
            className={cn(
              "min-h-[80px] resize-none border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-gray-400 dark:placeholder:text-gray-600",
              "text-sm leading-relaxed"
            )}
          />

          {/* Actions Bar - Always show if there's text or focused */}
          {(isFocused || value.trim().length > 0) && (
            <div className="comment-actions-bar flex items-center justify-between pt-2 mt-2 border-t border-gray-100 dark:border-gray-800">
              {/* <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                  disabled={disabled || isSubmitting}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                  disabled={disabled || isSubmitting}
                >
                  <AtSign className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-500 hover:text-gray-700"
                  disabled={disabled || isSubmitting}
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </div> */}
              &nbsp;
              <div className="flex items-center gap-2">
                {/* <span className="text-xs text-gray-400 dark:text-gray-600">
                  {value.length > 0 && `${value.length} characters`}
                </span> */}
                <Button
                  type="button"
                  size="sm"
                  onMouseDown={(e) => {
                    // Use onMouseDown to capture the event before blur
                    e.preventDefault();
                    e.stopPropagation();
                    if (canSubmit) {
                      onSubmit();
                    }
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  disabled={!canSubmit}
                  className="h-7 px-3 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      Send
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* {!isFocused && (
        <p className="text-xs text-gray-500 dark:text-gray-400 px-1">
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
            ⌘
          </kbd>{" "}
          +{" "}
          <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
            Enter
          </kbd>
          to send
        </p>
      )} */}
    </div>
  );
}
