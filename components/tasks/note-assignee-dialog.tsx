"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNoteAssignees } from "@/hooks/use-note-assignees";
import { useUpdateNoteAssignees } from "@/hooks/use-note-assignees";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { useAuthStore } from "@/lib/stores/auth-store";
import { Loader2, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NoteAssigneeDialogProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
}

interface WorkspaceMember {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  fullName: string;
}

export function NoteAssigneeDialog({
  noteId,
  open,
  onOpenChange,
  onClose,
}: NoteAssigneeDialogProps) {
  const { data: assignees = [], isLoading: isLoadingAssignees } =
    useNoteAssignees(noteId && open ? noteId : "");
  const updateAssigneesMutation = useUpdateNoteAssignees();
  const { currentWorkspace } = useWorkspaceContext();
  const { token } = useAuthStore();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch workspace members when dialog opens
  useEffect(() => {
    if (open && currentWorkspace?.id && token) {
      fetchWorkspaceMembers();
    }
  }, [open, currentWorkspace?.id, token]);

  const fetchWorkspaceMembers = async () => {
    try {
      setIsLoadingMembers(true);
      const response = await fetch(
        `/api/workspaces/${currentWorkspace?.id}/members`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success && data.members) {
        // Filter only members with userId (actual users, not just invites)
        const formattedMembers = data.members
          .filter((m: any) => m.user && m.user.userId)
          .map((m: any) => ({
            userId: m.user.userId,
            firstName: m.user.firstName || "",
            lastName: m.user.lastName || "",
            email: m.user.email || m.email || "",
            fullName:
              m.user.fullName ||
              `${m.user.firstName} ${m.user.lastName}`.trim() ||
              m.email,
          }));
        setMembers(formattedMembers);
      }
    } catch (error) {
      console.error("Failed to fetch workspace members:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // Get currently assigned user IDs
  const assignedUserIds = new Set(
    assignees.map((a) => a.user?.user_id || a.user_id)
  );

  // Handle user click - toggle assignee (add or remove)
  const handleUserClick = async (userId: string) => {
    if (!noteId || !token) return;

    const isCurrentlyAssigned = assignedUserIds.has(userId);
    let newUserIds: string[];

    if (isCurrentlyAssigned) {
      // Remove user from assignees
      newUserIds = Array.from(assignedUserIds).filter((id) => id !== userId);
    } else {
      // Add user to assignees
      newUserIds = [...Array.from(assignedUserIds), userId];
    }

    try {
      await updateAssigneesMutation.mutateAsync({
        noteId,
        userIds: newUserIds,
      });
      toast.success(
        isCurrentlyAssigned
          ? "Assignee removed successfully"
          : "Assignee added successfully"
      );
    } catch (error) {
      toast.error("Failed to update assignees");
    }
  };

  // Filter members based on search query
  const filteredMembers = members.filter((member) => {
    const query = searchQuery.toLowerCase();
    return (
      member.fullName.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    );
  });

  const isLoading = isLoadingAssignees || isLoadingMembers;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Team Members</DialogTitle>
          <DialogDescription>
            Click on a team member to assign or unassign them to this note.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {/* Search Input */}
          <Input
            placeholder="Search team members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />

          {/* Members List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No team members found
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const isAssigned = assignedUserIds.has(member.userId);
                    const initials =
                      `${member.firstName?.[0] || ""}${
                        member.lastName?.[0] || ""
                      }`.toUpperCase() || member.email[0].toUpperCase();

                    return (
                      <div
                        key={member.userId}
                        onClick={() => handleUserClick(member.userId)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                          "hover:bg-accent hover:border-primary/50",
                          isAssigned && "bg-primary/5 border-primary"
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src="" alt={member.fullName} />
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {member.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                        {isAssigned && (
                          <div className="flex-shrink-0">
                            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="h-4 w-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
