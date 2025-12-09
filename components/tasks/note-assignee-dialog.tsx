"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AssigneeSelector } from "@/components/assignees/assignee-selector";
import { useNoteAssignees } from "@/hooks/use-note-assignees";
import { useUpdateNoteAssignees } from "@/hooks/use-note-assignees";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";
import { Loader2 } from "lucide-react";
import type { Assignee } from "@/components/assignees/assignee-avatar-group";

interface NoteAssigneeDialogProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose?: () => void;
}

export function NoteAssigneeDialog({
  noteId,
  open,
  onOpenChange,
  onClose,
}: NoteAssigneeDialogProps) {
  const { data: assignees = [], isLoading } = useNoteAssignees(noteId);
  const updateAssigneesMutation = useUpdateNoteAssignees();
  const { currentWorkspace } = useWorkspaceContext();
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([]);

  useEffect(() => {
    if (assignees.length > 0) {
      const formatted = assignees.map((a) => ({
        user_id: a.user.user_id,
        first_name: a.user.first_name,
        last_name: a.user.last_name,
        email: a.user.email,
      }));
      setSelectedAssignees(formatted);
    } else {
      setSelectedAssignees([]);
    }
  }, [assignees]);

  const handleSave = async () => {
    const userIds = selectedAssignees.map((a) => a.user_id);
    await updateAssigneesMutation.mutateAsync({
      noteId,
      userIds,
    });
    onClose?.();
    onOpenChange(false);
  };

  const workspaceLeadId = currentWorkspace?.id || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Note Assignees</DialogTitle>
          <DialogDescription>
            Select team members to assign to this note. They will be notified
            about updates.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <AssigneeSelector
              leadId={workspaceLeadId}
              selectedAssignees={selectedAssignees}
              onAssigneesChange={setSelectedAssignees}
              onSave={handleSave}
            />
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => {
              onClose?.();
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateAssigneesMutation.isPending}
          >
            {updateAssigneesMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
