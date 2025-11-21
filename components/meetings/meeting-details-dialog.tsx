"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useMeeting } from "@/hooks/use-meetings";
import { Loader2, Calendar, Edit } from "lucide-react";

interface MeetingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meetingId?: string;
  onEdit?: (meetingId: string) => void;
}

function formatDateTime(isoString: string): string {
  if (!isoString) return "";
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    return isoString;
  }
}

export function MeetingDetailsDialog({
  open,
  onOpenChange,
  meetingId,
  onEdit,
}: MeetingDetailsDialogProps) {
  const {
    data: meetingData,
    isLoading: isLoadingMeeting,
    error,
  } = useMeeting(meetingId || "");

  const meeting = meetingData?.data;

  useEffect(() => {
    if (process.env.NODE_ENV === "development" && meetingId) {
      console.log("MeetingDetailsDialog - meetingId:", meetingId);
      console.log("MeetingDetailsDialog - meetingData:", meetingData);
      console.log("MeetingDetailsDialog - meeting:", meeting);
      console.log("MeetingDetailsDialog - isLoading:", isLoadingMeeting);
      console.log("MeetingDetailsDialog - error:", error);
    }
  }, [meetingId, meetingData, meeting, isLoadingMeeting, error]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleEdit = () => {
    if (meetingId && onEdit) {
      onEdit(meetingId);
    }
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Meeting Details
          </DialogTitle>
          <DialogDescription>
            View meeting information and details
          </DialogDescription>
        </DialogHeader>

        {isLoadingMeeting ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-red-500 dark:text-red-400">
              Error loading meeting:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        ) : !meeting ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Meeting not found
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Title
              </Label>
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {meeting.title}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Meeting Time
              </Label>
              <p className="text-base text-gray-900 dark:text-gray-100">
                {formatDateTime(meeting.time)}
              </p>
            </div>

            {meeting.type && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Type
                </Label>
                <p className="text-base text-gray-900 dark:text-gray-100">
                  {meeting.type}
                </p>
              </div>
            )}

            {meeting.link && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Meeting Link
                </Label>
                <div>
                  <a
                    href={meeting.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline break-all"
                  >
                    {meeting.link}
                  </a>
                </div>
              </div>
            )}

            {meeting.description && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Description
                </Label>
                <p className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                  {meeting.description}
                </p>
              </div>
            )}

            {meeting.meetingNotes && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Meeting Notes
                </Label>
                <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-base text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                    {meeting.meetingNotes}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400">
                {meeting.createdAt && (
                  <p>
                    Created:{" "}
                    {new Date(meeting.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {meeting.updatedAt &&
                  meeting.updatedAt !== meeting.createdAt && (
                    <p>
                      Updated:{" "}
                      {new Date(meeting.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Close
          </Button>
          {/* {meetingId && onEdit && (
            <Button type="button" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Meeting
            </Button>
          )} */}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
