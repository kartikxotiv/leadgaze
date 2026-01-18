"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AssigneeAvatarGroup } from "@/components/assignees/assignee-avatar-group";
import { useUpdateTaskStatus } from "@/hooks/use-unified-tasks";
import { useTaskAssignees } from "@/hooks/use-task-assignees";
import { useNoteAssignees } from "@/hooks/use-note-assignees";
import { useMeetingAssignees } from "@/hooks/use-meeting-assignees";
import { format } from "date-fns";
import {
  FileText,
  Calendar,
  CheckSquare,
  Clock,
  User,
  UserPlus,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { UnifiedTask } from "@/hooks/use-unified-tasks";

interface TaskCardProps {
  task: UnifiedTask;
  onAssigneeClick?: () => void;
}

const getTypeIcon = (type: UnifiedTask["type"]) => {
  switch (type) {
    case "note":
      return FileText;
    case "meeting":
      return Calendar;
    case "task":
      return CheckSquare;
    default:
      return CheckSquare;
  }
};

const getTypeBadgeColor = (type: UnifiedTask["type"]) => {
  switch (type) {
    case "note":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200";
    case "meeting":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200";
    case "task":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case "NEW":
      return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200";
    case "INPROGRESS":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200";
    case "DONE":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getStatusLabel = (status: string) => {
  switch (status.toUpperCase()) {
    case "NEW":
      return "New";
    case "INPROGRESS":
    case "IN_PROGRESS":
      return "In Progress";
    case "DONE":
      return "Done";
    default:
      return status;
  }
};

export function TaskCard({ task, onAssigneeClick }: TaskCardProps) {
  const updateStatusMutation = useUpdateTaskStatus();

  // Fetch assignees based on task type
  const taskId = task.type === "task" ? task.id.replace("task-", "") : "";
  const noteId = task.type === "note" ? task.id.replace("note-", "") : "";
  const meetingId =
    task.type === "meeting" ? task.id.replace("meeting-", "") : "";

  const { data: taskAssignees = [] } = useTaskAssignees(taskId);
  const { data: noteAssignees = [] } = useNoteAssignees(noteId);
  const { data: meetingAssignees = [] } = useMeetingAssignees(meetingId);

  // Get assignees based on type
  const assignees =
    task.type === "task"
      ? taskAssignees
      : task.type === "note"
      ? noteAssignees
      : meetingAssignees;

  const TypeIcon = getTypeIcon(task.type);

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({
      taskId: task.id,
      status: newStatus as "NEW" | "INPROGRESS" | "DONE",
    });
  };

  const formattedAssignees = assignees.map((a: any) => ({
    user_id: a.user?.user_id || a.user_id,
    first_name: a.user?.first_name || a.first_name || "",
    last_name: a.user?.last_name || a.last_name || "",
    email: a.user?.email || a.email || "",
  }));

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
              <Badge
                variant="outline"
                className={cn("text-xs", getTypeBadgeColor(task.type))}
              >
                {task.type.charAt(0).toUpperCase() + task.type.slice(1)}
              </Badge>
              <h4 className="font-semibold text-sm truncate">{task.title}</h4>
            </div>

            {task.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
              {task.lead_id && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span>Lead</span>
                </div>
              )}

              {task.time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(task.time), "MMM d, h:mm a")}</span>
                </div>
              )}

              {(task.due_date || (task.type === "note" && task.created_at)) && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {task.type === "note" && !task.due_date
                      ? `Created: ${format(
                          new Date(task.created_at),
                          "MMM d, h:mm a"
                        )}`
                      : task.due_date
                      ? `Due: ${format(
                          new Date(task.due_date),
                          "MMM d, h:mm a"
                        )}`
                      : ""}
                  </span>
                </div>
              )}

              {task.priority && (
                <Badge variant="outline" className="text-xs">
                  {task.priority}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "text-xs h-8 px-3 rounded-lg border flex items-center",
                  getStatusColor(task.status)
                )}
              >
                {getStatusLabel(task.status)}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={updateStatusMutation.isPending}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => handleStatusChange("INPROGRESS")}>
                    In Progress
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange("DONE")}>
                    Done
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {(task.type === "task" ||
              task.type === "note" ||
              task.type === "meeting") && (
              <div className="cursor-pointer">
                {formattedAssignees.length > 0 ? (
                  <div onClick={onAssigneeClick}>
                    <AssigneeAvatarGroup
                      assignees={formattedAssignees}
                      maxVisible={3}
                      size="sm"
                    />
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssigneeClick?.();
                    }}
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Assign
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
