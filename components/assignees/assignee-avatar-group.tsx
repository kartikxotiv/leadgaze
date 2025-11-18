"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface Assignee {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface AssigneeAvatarGroupProps {
  assignees: Assignee[];
  maxVisible?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  onAvatarClick?: (assignee: Assignee) => void;
  showTooltip?: boolean;
}

const sizeClasses = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-[12px]",
  md: "h-8 w-8 text-[14px]",
  lg: "h-10 w-10 text-[16px]",
};

/**
 * Get initials from first and last name
 */
function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || "";
  const last = lastName?.charAt(0)?.toUpperCase() || "";
  return `${first}${last}`;
}

/**
 * Get a consistent color for a user based on their name
 */
function getUserColor(userId: string): string {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-yellow-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-teal-500",
  ];

  // Simple hash function to get consistent color
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function AssigneeAvatarGroup({
  assignees,
  maxVisible = 3,
  size = "xs",
  className,
  onAvatarClick,
  showTooltip = true,
}: AssigneeAvatarGroupProps) {
  const visibleAssignees = assignees.slice(0, maxVisible);
  const remainingCount = Math.max(0, assignees.length - maxVisible);

  if (assignees.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center -space-x-2", className)}>
        {visibleAssignees.map((assignee, index) => {
          const initials = getInitials(assignee.first_name, assignee.last_name);
          const fullName = `${assignee.first_name} ${assignee.last_name}`;
          const colorClass = getUserColor(assignee.user_id);

          const avatarElement = (
            <Avatar
              key={assignee.user_id}
              className={cn(
                sizeClasses[size],
                "border-2 border-background cursor-pointer hover:z-10 transition-transform ",
                onAvatarClick && "cursor-pointer"
              )}
              onClick={() => onAvatarClick?.(assignee)}
              style={{ zIndex: visibleAssignees.length - index }}
            >
              <AvatarImage src="" alt={fullName} />
              <AvatarFallback
                className={cn(colorClass, "text-white font-medium text-[11px]")}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
          );

          if (showTooltip) {
            return (
              <Tooltip key={assignee.user_id}>
                <TooltipTrigger asChild>{avatarElement}</TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {assignee.email}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return avatarElement;
        })}

        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar
                className={cn(
                  sizeClasses[size],
                  "border-2 border-background bg-muted hover:z-10 transition-transform hover:scale-110"
                )}
                style={{ zIndex: 0 }}
              >
                <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium">
                  +{remainingCount}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">
                {remainingCount} more{" "}
                {remainingCount === 1 ? "assignee" : "assignees"}
              </p>
              {assignees.slice(maxVisible).map((assignee) => (
                <p
                  key={assignee.user_id}
                  className="text-xs text-muted-foreground"
                >
                  {assignee.first_name} {assignee.last_name}
                </p>
              ))}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
