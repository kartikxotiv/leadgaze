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

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number?: string | null;
}

interface ContactAvatarProps {
  contact: Contact | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
  showTooltip?: boolean;
  showLabel?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
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
 * Get a consistent color for a contact based on their ID
 */
function getContactColor(contactId: string): string {
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
  for (let i = 0; i < contactId.length; i++) {
    hash = contactId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function ContactAvatar({
  contact,
  size = "md",
  className,
  showTooltip = true,
  showLabel = false,
  showEmail = true,
  showPhone = false,
}: ContactAvatarProps) {
  if (!contact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div
          className={cn(
            sizeClasses[size],
            "rounded-full bg-muted flex items-center justify-center"
          )}
        >
          <span className="text-muted-foreground text-xs">—</span>
        </div>
        {showLabel && (
          <span className="text-sm text-muted-foreground">
            No linked contact
          </span>
        )}
      </div>
    );
  }

  const initials = getInitials(contact.first_name, contact.last_name);
  const fullName = `${contact.first_name} ${contact.last_name}`;
  const colorClass = getContactColor(contact.id);

  const avatarElement = (
    <div className={cn("flex items-center gap-2", className)}>
      <Avatar className={cn(sizeClasses[size], "border-2 border-background")}>
        <AvatarImage src="" alt={fullName} />
        <AvatarFallback
          className={cn(colorClass, "text-white font-medium text-[11px]")}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {showLabel && (
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{fullName}</span>
          {showEmail && contact.email && (
            <span className="text-xs text-muted-foreground truncate">
              {contact.email}
            </span>
          )}
          {showPhone && contact.phone_number && (
            <span className="text-xs text-muted-foreground truncate">
              {contact.phone_number}
            </span>
          )}
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
            {contact.email && (
              <p className="text-xs text-muted-foreground">{contact.email}</p>
            )}
            {contact.phone_number && (
              <p className="text-xs text-muted-foreground">
                {contact.phone_number}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return avatarElement;
}
