"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TaskCard } from "./task-card";
import { useUnifiedTasks } from "@/hooks/use-unified-tasks";
import {
  Loader2,
  FileText,
  Calendar,
  CheckSquare,
  Search,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskAssigneeDialog } from "./task-assignee-dialog";
import { NoteAssigneeDialog } from "./note-assignee-dialog";
import { MeetingAssigneeDialog } from "./meeting-assignee-dialog";
import { cn } from "@/lib/utils";
import { isToday, isPast, isFuture, addDays, startOfDay } from "date-fns";
import type { UnifiedTask } from "@/hooks/use-unified-tasks";

interface UnifiedTasksListProps {
  className?: string;
}

export function UnifiedTasksList({ className }: UnifiedTasksListProps) {
  const { data: tasks = [], isLoading, error } = useUnifiedTasks();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Main tabs: meetings, notes
  const [mainTab, setMainTab] = useState<"meetings" | "notes">("notes");

  // Sub-tabs: today, overdue, upcoming
  const [activeTab, setActiveTab] = useState<"today" | "overdue" | "upcoming">(
    "today"
  );

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<
    "task" | "note" | "meeting" | null
  >(null);
  const [showAssigneeDialog, setShowAssigneeDialog] = useState(false);

  // Date filtering logic - filters by both mainTab and activeTab
  const getDateFilteredTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const nextWeek = addDays(today, 7);

    // First filter by main tab type (meetings or notes)
    const typeFilteredTasks = tasks.filter((task) => {
      if (mainTab === "meetings") return task.type === "meeting";
      if (mainTab === "notes") return task.type === "note";
      return false;
    });

    // Then filter by date sub-tab
    switch (activeTab) {
      case "today":
        return typeFilteredTasks.filter((task) => {
          if (task.type === "meeting" && task.time) {
            return (
              isToday(new Date(task.time)) &&
              task.status.toUpperCase() !== "DONE"
            );
          }
          if (task.type === "task" && task.due_date) {
            return (
              isToday(new Date(task.due_date)) &&
              task.status.toUpperCase() !== "DONE"
            );
          }
          if (task.type === "note") {
            // For notes, use due_date if available, otherwise use created_at for "Today" tab
            const dateToCheck = task.due_date || task.created_at;
            return (
              isToday(new Date(dateToCheck)) &&
              task.status.toUpperCase() !== "DONE"
            );
          }
          return false;
        });
      case "overdue":
        return typeFilteredTasks.filter((task) => {
          if (task.type === "meeting" && task.time) {
            const meetingDate = new Date(task.time);
            return (
              isPast(meetingDate) &&
              !isToday(meetingDate) &&
              task.status.toUpperCase() !== "DONE"
            );
          }
          if (task.type === "task" && task.due_date) {
            const dueDate = new Date(task.due_date);
            return (
              isPast(dueDate) &&
              !isToday(dueDate) &&
              task.status.toUpperCase() !== "DONE"
            );
          }
          if (task.type === "note") {
            // For notes, use due_date if available, otherwise use created_at as fallback
            const dateToCheck = task.due_date || task.created_at;

            if (!dateToCheck) {
              return false;
            }

            // Handle string that might be empty or whitespace
            const dateStr = String(dateToCheck).trim();
            if (!dateStr || dateStr === "null" || dateStr === "undefined") {
              return false;
            }

            const checkDate = new Date(dateStr);

            // Check if date is valid
            if (isNaN(checkDate.getTime())) {
              return false;
            }

            // For overdue: date must be in the past and not today
            const isPastDate = isPast(checkDate);
            const isNotToday = !isToday(checkDate);
            const isNotDone = task.status.toUpperCase() !== "DONE";

            return isPastDate && isNotToday && isNotDone;
          }
          return false;
        });
      case "upcoming":
        return typeFilteredTasks.filter((task) => {
          if (task.type === "meeting" && task.time) {
            const meetingDate = new Date(task.time);
            return (
              isFuture(meetingDate) &&
              !isToday(meetingDate) && // Exclude today's meetings - show all future meetings
              task.status.toUpperCase() !== "DONE"
            );
          }
          if (task.type === "task" && task.due_date) {
            const dueDate = new Date(task.due_date);
            return (
              isFuture(dueDate) &&
              dueDate <= nextWeek &&
              task.status.toUpperCase() !== "DONE"
            );
          }
          if (task.type === "note" && task.due_date) {
            const dueDate = new Date(task.due_date);
            return (
              isFuture(dueDate) &&
              dueDate <= nextWeek &&
              task.status.toUpperCase() !== "DONE"
            );
          }
          return false;
        });
      default:
        return typeFilteredTasks;
    }
  }, [tasks, mainTab, activeTab]);

  const filteredTasks = getDateFilteredTasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      task.status.toUpperCase() === statusFilter.toUpperCase();

    const matchesType = typeFilter === "all" || task.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate tab counts - for current main tab
  const tabCounts = useMemo(() => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const nextWeek = addDays(today, 7);

    // Filter by main tab type first
    const mainTabTasks = tasks.filter((task) => {
      if (mainTab === "meetings") return task.type === "meeting";
      if (mainTab === "notes") return task.type === "note";
      return false;
    });

    const todayTasks = mainTabTasks.filter((task) => {
      if (task.type === "meeting" && task.time) {
        return (
          isToday(new Date(task.time)) && task.status.toUpperCase() !== "DONE"
        );
      }
      if (task.type === "task" && task.due_date) {
        return (
          isToday(new Date(task.due_date)) &&
          task.status.toUpperCase() !== "DONE"
        );
      }
      if (task.type === "note") {
        // For notes, use due_date if available, otherwise use created_at for "Today" tab
        const dateToCheck = task.due_date || task.created_at;
        return (
          isToday(new Date(dateToCheck)) && task.status.toUpperCase() !== "DONE"
        );
      }
      return false;
    });

    const overdueTasks = mainTabTasks.filter((task) => {
      if (task.type === "meeting" && task.time) {
        const meetingDate = new Date(task.time);
        return (
          isPast(meetingDate) &&
          !isToday(meetingDate) &&
          task.status.toUpperCase() !== "DONE"
        );
      }
      if (task.type === "task" && task.due_date) {
        const dueDate = new Date(task.due_date);
        return (
          isPast(dueDate) &&
          !isToday(dueDate) &&
          task.status.toUpperCase() !== "DONE"
        );
      }
      if (task.type === "note") {
        // For notes, use due_date if available, otherwise use created_at as fallback
        const dateToCheck = task.due_date || task.created_at;

        if (!dateToCheck) {
          return false;
        }

        // Handle string that might be empty or whitespace
        const dateStr = String(dateToCheck).trim();
        if (!dateStr || dateStr === "null" || dateStr === "undefined") {
          return false;
        }

        const checkDate = new Date(dateStr);

        // Check if date is valid
        if (isNaN(checkDate.getTime())) {
          return false;
        }

        // For overdue: date must be in the past and not today
        return (
          isPast(checkDate) &&
          !isToday(checkDate) &&
          task.status.toUpperCase() !== "DONE"
        );
      }
      return false;
    });

    const upcomingTasks = mainTabTasks.filter((task) => {
      if (task.type === "meeting" && task.time) {
        const meetingDate = new Date(task.time);
        return (
          isFuture(meetingDate) &&
          // Show all future meetings, not just next week
          task.status.toUpperCase() !== "DONE"
        );
      }
      if (task.type === "task" && task.due_date) {
        const dueDate = new Date(task.due_date);
        return (
          isFuture(dueDate) &&
          dueDate <= nextWeek &&
          task.status.toUpperCase() !== "DONE"
        );
      }
      if (task.type === "note" && task.due_date) {
        const dueDate = new Date(task.due_date);
        return (
          isFuture(dueDate) &&
          dueDate <= nextWeek &&
          task.status.toUpperCase() !== "DONE"
        );
      }
      return false;
    });

    return {
      today: todayTasks.length,
      overdue: overdueTasks.length,
      upcoming: upcomingTasks.length,
      all: mainTabTasks.length,
    };
  }, [tasks, mainTab]);

  const meetingCounts = useMemo(() => {
    const today = startOfDay(new Date());
    const nextWeek = addDays(today, 7);

    const meetingTasks = tasks.filter((task) => task.type === "meeting");

    const todayTasks = meetingTasks.filter((task) => {
      if (task.time) {
        return isToday(new Date(task.time)) && task.status.toUpperCase() !== "DONE";
      }
      return false;
    });

    const overdueTasks = meetingTasks.filter((task) => {
      if (task.time) {
        const meetingDate = new Date(task.time);
        return (
          isPast(meetingDate) &&
          !isToday(meetingDate) &&
          task.status.toUpperCase() !== "DONE"
        );
      }
      return false;
    });

    const upcomingTasks = meetingTasks.filter((task) => {
      if (task.time) {
        const meetingDate = new Date(task.time);
        return isFuture(meetingDate) && task.status.toUpperCase() !== "DONE";
      }
      return false;
    });

    return {
      today: todayTasks.length,
      overdue: overdueTasks.length,
      upcoming: upcomingTasks.length,
    };
  }, [tasks]);

  const stats = {
    total: tasks.length,
    notes: tasks.filter((t) => t.type === "note").length,
    meetings: tasks.filter((t) => t.type === "meeting").length,
    tasks: tasks.filter((t) => t.type === "task").length,
    new: tasks.filter((t) => t.status.toUpperCase() === "NEW").length,
    inProgress: tasks.filter((t) => t.status.toUpperCase() === "INPROGRESS")
      .length,
    done: tasks.filter((t) => t.status.toUpperCase() === "DONE").length,
  };

  const handleAssigneeClick = useCallback(
    (taskId: string, taskType: "task" | "note" | "meeting") => {
      setSelectedTaskId(taskId);
      setSelectedTaskType(taskType);
      setShowAssigneeDialog(true);
    },
    []
  );

  const handleDialogClose = useCallback(() => {
    setShowAssigneeDialog(false);
    setSelectedTaskId(null);
    setSelectedTaskType(null);
  }, []);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setShowAssigneeDialog(false);
      setSelectedTaskId(null);
      setSelectedTaskType(null);
    } else {
      setShowAssigneeDialog(true);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">
            Error loading tasks:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      <Card className="bg-unset border-none">
        <CardHeader>
          <div className="">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setMainTab("meetings");
                  setActiveTab("today");
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                  mainTab === "meetings"
                    ? "bg-purple-100 text-purple-900 dark:bg-purple-900 dark:text-purple-100"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                <Calendar className="h-4 w-4" />
                Meetings ({meetingCounts.today + meetingCounts.overdue + meetingCounts.upcoming})
              </button>
              <button
                onClick={() => {
                  setMainTab("notes");
                  setActiveTab("today");
                }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                  mainTab === "notes"
                    ? "bg-blue-100 text-blue-900 dark:bg-blue-900 dark:text-blue-100"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                )}
              >
                <FileText className="h-4 w-4" />
                Notes ({tasks.filter((t) => t.type === "note").length})
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Sub Tabs - Date Filtering */}
          <div className="mb-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) =>
                setActiveTab(v as "today" | "overdue" | "upcoming")
              }
            >
              <TabsList className="grid w-full grid-cols-3 max-w-md p-2 bg-white border border-gray-200 rounded-lg">
                <TabsTrigger
                  value="today"
                  className="flex items-center gap-2 py-2"
                >
                  <Clock className="h-4 w-4" />
                  Today ({tabCounts.today})
                </TabsTrigger>
                <TabsTrigger
                  value="overdue"
                  className="flex items-center gap-2 py-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Overdue ({tabCounts.overdue})
                </TabsTrigger>
                <TabsTrigger
                  value="upcoming"
                  className="flex items-center gap-2 py-2"
                >
                  <Calendar className="h-4 w-4" />
                  Upcoming ({tabCounts.upcoming})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="NEW">NEW</SelectItem>
                <SelectItem value="INPROGRESS">INPROGRESS</SelectItem>
                <SelectItem value="DONE">DONE</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="note">Notes</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="task">Tasks</SelectItem>
              </SelectContent>
            </Select>
          </div> */}

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
              <p className="text-muted-foreground">
                {tasks.length === 0
                  ? "Create notes, meetings, or tasks to see them here"
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onAssigneeClick={() =>
                    handleAssigneeClick(task.id, task.type)
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignee Dialogs */}
      {selectedTaskId && selectedTaskType === "task" && showAssigneeDialog && (
        <TaskAssigneeDialog
          key={`task-${selectedTaskId}`}
          taskId={selectedTaskId.replace("task-", "")}
          open={showAssigneeDialog}
          onOpenChange={handleDialogOpenChange}
          onClose={handleDialogClose}
        />
      )}
      {selectedTaskId && selectedTaskType === "note" && showAssigneeDialog && (
        <NoteAssigneeDialog
          key={`note-${selectedTaskId}`}
          noteId={selectedTaskId.replace("note-", "")}
          open={showAssigneeDialog}
          onOpenChange={handleDialogOpenChange}
          onClose={handleDialogClose}
        />
      )}
      {selectedTaskId &&
        selectedTaskType === "meeting" &&
        showAssigneeDialog && (
          <MeetingAssigneeDialog
            key={`meeting-${selectedTaskId}`}
            meetingId={selectedTaskId.replace("meeting-", "")}
            open={showAssigneeDialog}
            onOpenChange={handleDialogOpenChange}
            onClose={handleDialogClose}
          />
        )}
    </div>
  );
}
