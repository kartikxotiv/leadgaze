"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AssigneeSelector } from "./assignee-selector";
import { AssigneeAvatarGroup, type Assignee } from "./assignee-avatar-group";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/stores/auth-store";

interface AssigneeDialogProps {
  leadId: string;
  trigger?: React.ReactNode;
  onAssigneesUpdated?: (assignees: Assignee[]) => void;
}

/**
 * Dialog component for managing lead assignees
 * Fetches current assignees and allows updating them
 */
export function AssigneeDialog({
  leadId,
  trigger,
  onAssigneesUpdated,
}: AssigneeDialogProps) {
  const [open, setOpen] = useState(false);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (open && leadId) {
      fetchAssignees();
    }
  }, [open, leadId]);

  const fetchAssignees = async () => {
    try {
      setIsLoading(true);
      if (!token) {
        toast.error("Authentication required");
        return;
      }

      const response = await fetch(`/api/sales-leads/${leadId}/assignees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const formattedAssignees: Assignee[] = data.data.map((item: any) => ({
          user_id: item.user.user_id,
          first_name: item.user.first_name,
          last_name: item.user.last_name,
          email: item.user.email,
        }));
        setAssignees(formattedAssignees);
      } else {
        toast.error(data.error || "Failed to fetch assignees");
      }
    } catch (error) {
      console.error("Failed to fetch assignees:", error);
      toast.error("Failed to fetch assignees");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    setOpen(false);
    onAssigneesUpdated?.(assignees);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <UserPlus className="h-4 w-4 mr-2" />
      Manage Assignees
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Assignees</DialogTitle>
          <DialogDescription>
            Select team members to assign to this lead. They will be notified about
            updates and can collaborate on this lead.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <AssigneeSelector
              leadId={leadId}
              selectedAssignees={assignees}
              onAssigneesChange={setAssignees}
              onSave={handleSave}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline component that shows assignees and allows editing via dialog
 */
interface AssigneeInlineEditorProps {
  leadId: string;
  onAssigneesUpdated?: (assignees: Assignee[]) => void;
  size?: "sm" | "md" | "lg";
  maxVisible?: number;
}

export function AssigneeInlineEditor({
  leadId,
  onAssigneesUpdated,
  size = "md",
  maxVisible = 3,
}: AssigneeInlineEditorProps) {
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuthStore();

  useEffect(() => {
    if (leadId) {
      fetchAssignees();
    }
  }, [leadId]);

  const fetchAssignees = async () => {
    try {
      setIsLoading(true);
      if (!token) {
        return;
      }

      const response = await fetch(`/api/sales-leads/${leadId}/assignees`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        const formattedAssignees: Assignee[] = data.data.map((item: any) => ({
          user_id: item.user.user_id,
          first_name: item.user.first_name,
          last_name: item.user.last_name,
          email: item.user.email,
        }));
        setAssignees(formattedAssignees);
      }
    } catch (error) {
      console.error("Failed to fetch assignees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssigneesUpdated = (newAssignees: Assignee[]) => {
    setAssignees(newAssignees);
    onAssigneesUpdated?.(newAssignees);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {assignees.length > 0 ? (
        <AssigneeAvatarGroup
          assignees={assignees}
          size={size}
          maxVisible={maxVisible}
        />
      ) : (
        <span className="text-sm text-muted-foreground">No assignees</span>
      )}
      <AssigneeDialog
        leadId={leadId}
        onAssigneesUpdated={handleAssigneesUpdated}
        trigger={
          <Button variant="ghost" size="sm" className="h-8 px-2">
            <UserPlus className="h-4 w-4" />
          </Button>
        }
      />
    </div>
  );
}

