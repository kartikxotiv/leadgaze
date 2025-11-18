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

export interface Owner {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface OwnerAvatarProps {
  owner: Owner | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  showTooltip?: boolean;
  showLabel?: boolean;
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
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
 * Get a consistent color for a user based on their user ID
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

  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

/**
 * Reusable component to display a single owner avatar
 */
export function OwnerAvatar({
  owner,
  size = "md",
  className,
  onClick,
  showTooltip = true,
  showLabel = false,
}: OwnerAvatarProps) {
  if (!owner) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* <div
          className={cn(
            sizeClasses[size],
            "rounded-full bg-muted flex items-center justify-center"
          )}
        >
          <span className="text-muted-foreground text-xs">—</span>
        </div> */}
        {showLabel && (
          <span className="text-sm text-muted-foreground">add owner</span>
        )}
      </div>
    );
  }

  const initials = getInitials(owner.first_name, owner.last_name);
  const fullName = `${owner.first_name} ${owner.last_name}`;
  const colorClass = getUserColor(owner.user_id);

  const avatarElement = (
    <div className={cn("flex items-center gap-2", className)}>
      <Avatar
        className={cn(
          sizeClasses[size],
          "border-2 border-background cursor-pointer transition-transform hover:scale-110",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
      >
        <AvatarImage src="" alt={fullName} />
        <AvatarFallback className={cn(colorClass, "text-white font-medium")}>
          {initials}
        </AvatarFallback>
      </Avatar>
      {showLabel && (
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{fullName}</span>
          <span className="text-xs text-muted-foreground truncate">
            {owner.email}
          </span>
        </div>
      )}
    </div>
  );

  if (showTooltip && !showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{avatarElement}</TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{fullName}</p>
            <p className="text-xs text-muted-foreground">{owner.email}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return avatarElement;
}
