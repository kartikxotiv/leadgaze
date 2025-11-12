"use client";

import React, { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { Owner } from "./owner-avatar";

interface OwnerSelectorProps {
  leadId: string;
  selectedOwner: Owner | null;
  onOwnerChange: (owner: Owner | null) => void;
  onSave?: () => void;
  className?: string;
}

interface OrganizationMember {
  userId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
}

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
 * Reusable component for selecting an owner from organization members
 */
export function OwnerSelector({
  leadId,
  selectedOwner,
  onOwnerChange,
  onSave,
  className,
}: OwnerSelectorProps) {
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { token, currentOrganization } = useAuthStore();

  useEffect(() => {
    if (currentOrganization?.organizationId) {
      fetchMembers();
    }
  }, [currentOrganization?.organizationId]);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      if (!token || !currentOrganization?.organizationId) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(
        `/api/organizations/${currentOrganization.organizationId}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setMembers(data.members || []);
      } else {
        toast.error(data.error || "Failed to load team members");
      }
    } catch (error) {
      console.error("Failed to fetch members:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOwner = (member: OrganizationMember | null) => {
    if (member) {
      const owner: Owner = {
        user_id: member.userId,
        first_name: member.firstName,
        last_name: member.lastName,
        email: member.email,
      };
      onOwnerChange(owner);
    } else {
      onOwnerChange(null);
    }
  };

  const handleSave = async () => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    try {
      setIsSaving(true);
      const ownerId = selectedOwner?.user_id || null;

      const response = await fetch(`/api/sales-leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ owner_id: ownerId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Owner updated successfully");
        onSave?.();
      } else {
        toast.error(data.error || "Failed to update owner");
      }
    } catch (error) {
      console.error("Failed to save owner:", error);
      toast.error("Failed to update owner");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.fullName.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Select Owner</h3>
          {selectedOwner && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelectOwner(null)}
              className="h-auto py-1 px-2 text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <ScrollArea className="h-[300px] rounded-md border">
            <div className="p-2 space-y-1">
              {filteredMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <UserPlus className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "No members found" : "No team members available"}
                  </p>
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const isSelected = selectedOwner?.user_id === member.userId;
                  const initials = getInitials(member.firstName, member.lastName);
                  const colorClass = getUserColor(member.userId);

                  return (
                    <div
                      key={member.userId}
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                        isSelected && "bg-accent ring-2 ring-primary"
                      )}
                      onClick={() => handleSelectOwner(member)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="" alt={member.fullName} />
                        <AvatarFallback
                          className={cn(colorClass, "text-white text-xs font-medium")}
                        >
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {member.email}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {onSave && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Owner"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

