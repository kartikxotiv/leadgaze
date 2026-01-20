"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateReminder,
  useUpdateReminder,
  useReminders,
  type Reminder,
} from "@/hooks/use-reminders";
import { Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceContext } from "@/hooks/use-workspace-context";

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  reminderId?: string;
  onSuccess?: () => void;
}

export function ReminderDialog({
  open,
  onOpenChange,
  leadId,
  reminderId,
  onSuccess,
}: ReminderDialogProps) {
  const [content, setContent] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(
    null,
  );
  const { currentWorkspace } = useWorkspaceContext();

  const isEditMode = !!selectedReminder;

  const { data: remindersData, refetch: refetchReminders } = useReminders({
    leadId,
  });
  const createReminderMutation = useCreateReminder();
  const updateReminderMutation = useUpdateReminder();

  const reminders: Reminder[] = (() => {
    if (Array.isArray(remindersData?.data?.reminders)) {
      return remindersData.data.reminders;
    }
    if (Array.isArray(remindersData?.data)) {
      return remindersData.data;
    }
    if (Array.isArray(remindersData?.reminders)) {
      return remindersData.reminders;
    }
    if (Array.isArray(remindersData)) {
      return remindersData;
    }
    return [];
  })();

  const formatDateTimeLocal = (isoString: string): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return "";
    }
  };

  useEffect(() => {
    if (open && leadId) {
      refetchReminders();
    } else if (!open) {
      setContent("");
      setRemindAt("");
      setSelectedReminder(null);
    }
  }, [open, leadId, refetchReminders]);

  useEffect(() => {
    if (!open) return;
    if (reminderId && reminders.length > 0) {
      const toEdit = reminders.find((r) => r.id === reminderId);
      if (toEdit) {
        setSelectedReminder(toEdit);
        setContent(toEdit.content);
        setRemindAt(formatDateTimeLocal(toEdit.remindAt));
        return;
      }
    }
    if (!reminderId && !selectedReminder && (content || remindAt)) {
      setContent("");
      setRemindAt("");
    }
  }, [open, reminderId, reminders, selectedReminder]);

  const handleCancelEdit = () => {
    setSelectedReminder(null);
    setContent("");
    setRemindAt("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }
    if (!remindAt) {
      toast.error("Reminder time is required");
      return;
    }
    try {
      if (isEditMode && selectedReminder) {
        await updateReminderMutation.mutateAsync({
          reminderId: selectedReminder.id,
          data: {
            content: content.trim(),
            remindAt: new Date(remindAt).toISOString(),
          },
        });
        toast.success("Reminder updated successfully");
      } else {
        await createReminderMutation.mutateAsync({
          leadId,
          content: content.trim(),
          remindAt: new Date(remindAt).toISOString(),
          workspaceId: currentWorkspace?.id,
        });
        toast.success("Reminder created successfully");
      }
      handleCancelEdit();
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        error?.data?.error ||
        "Failed to save reminder. Please try again.";
      toast.error(errorMessage);
    }
  };

  const isLoading =
    createReminderMutation.isPending || updateReminderMutation.isPending;

  const handleClose = () => {
    if (!isLoading) {
      handleCancelEdit();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {isEditMode ? "Update Reminder" : "Create Reminder"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Edit the reminder details"
              : "Add a reminder with content and time"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reminder-time">Reminder Time *</Label>
            <Input
              id="reminder-time"
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminder-content">Content *</Label>
            <Textarea
              id="reminder-content"
              placeholder="Enter reminder content..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading}
              rows={6}
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !content.trim() || !remindAt}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Update Reminder" : "Create Reminder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
