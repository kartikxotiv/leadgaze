"use client";

import { useState, useEffect } from "react";
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
  useCreateMeeting,
  useUpdateMeeting,
  useDeleteMeeting,
  useMeeting,
  type CreateMeetingData,
  type Meeting,
} from "@/hooks/use-meetings";
import { Loader2, Calendar, Plus } from "lucide-react";
import { toast } from "sonner";

interface MeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
  meetingId?: string;
  onSuccess?: () => void;
}

export function MeetingDialog({
  open,
  onOpenChange,
  leadId,
  meetingId,
  onSuccess,
}: MeetingDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [time, setTime] = useState("");
  const [link, setLink] = useState("");
  const [type, setType] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const formatDateTimeLocal = (isoString: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const isEditMode = !!selectedMeeting || !!meetingId;

  const createMeetingMutation = useCreateMeeting();
  const updateMeetingMutation = useUpdateMeeting();
  const deleteMeetingMutation = useDeleteMeeting();

  const { data: meetingData, isLoading: isLoadingMeeting } = useMeeting(
    meetingId || ""
  );

  useEffect(() => {
    if (meetingId && meetingData?.data) {
      const meeting = meetingData.data;
      setSelectedMeeting(meeting);
      setTitle(meeting.title || "");
      setDescription(meeting.description || "");
      setMeetingNotes(meeting.meetingNotes || "");
      setTime(formatDateTimeLocal(meeting.time));
      setLink(meeting.link || "");
      setType(meeting.type || "");
    }
  }, [meetingId, meetingData]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setMeetingNotes("");
      setTime("");
      setLink("");
      setType("");
      setSelectedMeeting(null);
    } else if (open && !meetingId) {
      setTitle("");
      setDescription("");
      setMeetingNotes("");
      setTime("");
      setLink("");
      setType("");
      setSelectedMeeting(null);
    }
  }, [open, meetingId]);

  const handleEdit = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setTitle(meeting.title);
    setDescription(meeting.description || "");
    setMeetingNotes(meeting.meetingNotes || "");
    setTime(formatDateTimeLocal(meeting.time));
    setLink(meeting.link || "");
    setType(meeting.type || "");
  };

  const handleCancelEdit = () => {
    setSelectedMeeting(null);
    setTitle("");
    setDescription("");
    setMeetingNotes("");
    setTime("");
    setLink("");
    setType("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!time) {
      toast.error("Meeting time is required");
      return;
    }

    try {
      const meetingIdToUpdate = meetingId || selectedMeeting?.id;

      if (isEditMode && meetingIdToUpdate) {
        await updateMeetingMutation.mutateAsync({
          meetingId: meetingIdToUpdate,
          data: {
            title: title.trim(),
            description: description.trim() || null,
            meetingNotes: meetingNotes.trim() || null,
            time: new Date(time).toISOString(),
            link: link.trim() || null,
            type: type.trim() || null,
            leadId: leadId || null,
          },
        });
        toast.success("Meeting updated successfully");
      } else {
        await createMeetingMutation.mutateAsync({
          leadId: leadId || null,
          title: title.trim(),
          description: description.trim() || null,
          meetingNotes: meetingNotes.trim() || null,
          time: new Date(time).toISOString(),
          link: link.trim() || null,
          type: type.trim() || null,
        });
        toast.success("Meeting created successfully");
      }

      handleCancelEdit();
      onSuccess?.();
    } catch (error) {}
  };

  const handleClose = () => {
    if (
      !createMeetingMutation.isPending &&
      !updateMeetingMutation.isPending &&
      !deleteMeetingMutation.isPending
    ) {
      handleCancelEdit();
      onOpenChange(false);
    }
  };

  const isLoading =
    createMeetingMutation.isPending ||
    updateMeetingMutation.isPending ||
    deleteMeetingMutation.isPending ||
    isLoadingMeeting;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isEditMode ? "Meeting Details" : "Create New Meeting"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "View and update meeting details"
              : "Create a new meeting for this lead"}
          </DialogDescription>
        </DialogHeader>

        {isLoadingMeeting ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="meeting-title">Title *</Label>
              <Input
                id="meeting-title"
                placeholder="Enter meeting title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-time">Meeting Time *</Label>
              <Input
                id="meeting-time"
                type="datetime-local"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-type">Type</Label>
              <Input
                id="meeting-type"
                placeholder="Enter meeting type (e.g., Zoom, Google Meet, In-person)"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-link">Link</Label>
              <Input
                id="meeting-link"
                type="url"
                placeholder="Enter meeting link (e.g., https://zoom.us/j/...)"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-description">Description</Label>
              <Textarea
                id="meeting-description"
                placeholder="Enter meeting description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="meeting-notes">Meeting Notes</Label>
              <Textarea
                id="meeting-notes"
                placeholder="Enter meeting notes..."
                value={meetingNotes}
                onChange={(e) => setMeetingNotes(e.target.value)}
                disabled={isLoading}
                rows={6}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isLoading}
              >
                {isEditMode ? "Cancel" : "Clear"}
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !title.trim() || !time}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Update Meeting" : "Create Meeting"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
