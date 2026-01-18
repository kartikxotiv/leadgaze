"use client";

import { Clock, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Reminder } from "@/hooks/use-reminders";

export interface ReminderCardProps {
  reminder: Reminder;
  onEdit: (reminder: Reminder) => void;
  onDelete: (reminderId: string) => void;
  isDeleting?: boolean;
}

export function ReminderCard({
  reminder,
  onEdit,
  onDelete,
  isDeleting,
}: ReminderCardProps) {
  const parseDateSafe = (input?: string): Date | null => {
    if (!input) return null;
    let s = input.trim();
    if (s.includes(" ") && !s.includes("T")) {
      s = s.replace(" ", "T");
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) {
      s = `${s}:00`;
    }
    if (!/[zZ]/.test(s) && !/[+-]\d{2}(:?\d{2})?$/.test(s)) {
      s = `${s}Z`;
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const remindDate = parseDateSafe(reminder.remindAt);
  const formattedDate = remindDate
    ? remindDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
  const formattedTime = remindDate
    ? remindDate.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

  return (
    <Card
      className="group hover:shadow-md transition-all duration-200 cursor-pointer"
      onClick={() => onEdit(reminder)}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Clock className="h-5 w-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                  Reminder at {formattedDate} {formattedTime}
                </h4>
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
                    onEdit(reminder);
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
                    onDelete(reminder.id);
                  }}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-3.5 w-3.5 text-gray-500 hover:text-red-600" />
                </Button>
              </div>
            </div>

            {reminder.content && (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words leading-relaxed line-clamp-2">
                {reminder.content}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
