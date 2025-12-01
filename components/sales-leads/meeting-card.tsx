"use client";

import { Calendar, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Meeting } from "@/hooks/use-meetings";

export interface MeetingCardProps {
  meeting: Meeting;
  onEdit: (meeting: Meeting) => void;
  onDelete: (meetingId: string) => void;
  isDeleting?: boolean;
}

export function MeetingCard({
  meeting,
  onEdit,
  onDelete,
  isDeleting,
}: MeetingCardProps) {
  const meetingDate = new Date(meeting.time);
  const formattedDate = meetingDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = meetingDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Card
      className="group hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onEdit(meeting)}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  {meeting.title}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formattedDate} at {formattedTime}
                </span>
              </div>
              <div
                className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(meeting);
                  }}
                >
                  <Edit className="h-3.5 w-3.5 text-gray-500 hover:text-blue-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(meeting.id);
                  }}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-600" />
                </Button>
              </div>
            </div>

            {meeting.description && (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed line-clamp-2">
                {meeting.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
