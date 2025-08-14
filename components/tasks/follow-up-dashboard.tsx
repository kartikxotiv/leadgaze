"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useTodaysFollowUps,
  useOverdueFollowUps,
  useUpcomingFollowUps,
  useUpdateActivity,
  useDeleteActivity,
  type Activity,
} from "@/hooks/use-activities";
import { useLeads } from "@/hooks/use-leads";
import { FollowUpScheduler } from "./follow-up-scheduler";
import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  Plus,
  MoreHorizontal,
  Phone,
  Mail,
  MessageSquare,
  Trash2,
  Edit,
  Bell,
  TrendingUp,
  Target,
  Loader2,
  RefreshCcw,
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FollowUpDashboardProps {
  className?: string;
}

const getActivityIcon = (activityType: Activity["activityType"]) => {
  switch (activityType) {
    case "call":
      return Phone;
    case "email":
      return Mail;
    case "task":
      return Clock;
    case "meeting":
      return Calendar;
    default:
      return MessageSquare;
  }
};

const getPriorityColor = (priority: Activity["priority"]) => {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800 border-red-200";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "low":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const formatTaskDate = (dateString: string) => {
  const date = new Date(dateString);

  if (isToday(date)) {
    return `Today at ${format(date, "h:mm a")}`;
  }
  if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, "h:mm a")}`;
  }
  return format(date, "MMM d 'at' h:mm a");
};

function TaskCard({
  activity,
  onComplete,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  onComplete: (id: string) => void;
  onEdit: (activity: Activity) => void;
  onDelete: (id: string) => void;
}) {
  const Icon = getActivityIcon(activity.activityType);
  const isOverdue = activity.dueDate && new Date(activity.dueDate) < new Date();
  const isCompleted = !!activity.completedAt;

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md border-l-4",
        isOverdue && !isCompleted
          ? "border-l-red-500 bg-red-50 dark:bg-red-950"
          : isCompleted
          ? "border-l-green-500 bg-green-50 dark:bg-green-950"
          : "border-l-blue-500"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                getPriorityColor(activity.priority)
              )}
            >
              <Icon className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <h4
                className={cn(
                  "font-semibold text-sm leading-6",
                  isCompleted && "line-through text-gray-500"
                )}
              >
                {activity.subject}
              </h4>

              {activity.description && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  {activity.description}
                </p>
              )}

              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                {activity.lead && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {activity.lead.firstName} {activity.lead.lastName}
                  </span>
                )}

                {activity.dueDate && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTaskDate(activity.dueDate)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn("text-xs", getPriorityColor(activity.priority))}
            >
              {activity.priority}
            </Badge>

            {isOverdue && !isCompleted && (
              <Badge variant="destructive" className="text-xs">
                Overdue
              </Badge>
            )}

            {isCompleted && (
              <Badge variant="default" className="text-xs bg-green-600">
                Completed
              </Badge>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!isCompleted && (
                  <DropdownMenuItem
                    onClick={() => onComplete(activity.activityId)}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Mark Complete
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onEdit(activity)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(activity.activityId)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {!isCompleted && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onComplete(activity.activityId)}
              className="text-xs"
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Complete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FollowUpDashboard({ className }: FollowUpDashboardProps) {
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editFormData, setEditFormData] = useState({
    subject: "",
    description: "",
    priority: "medium" as Activity["priority"],
    dueDate: "",
  });

  const {
    data: todaysTasks,
    isLoading: loadingToday,
    refetch: refetchToday,
  } = useTodaysFollowUps();
  const {
    data: overdueTasks,
    isLoading: loadingOverdue,
    refetch: refetchOverdue,
  } = useOverdueFollowUps();
  const {
    data: upcomingTasks,
    isLoading: loadingUpcoming,
    refetch: refetchUpcoming,
  } = useUpcomingFollowUps();
  const updateActivityMutation = useUpdateActivity();
  const deleteActivityMutation = useDeleteActivity();
  const { data: leadsData } = useLeads({ limit: "50" });

  const handleCompleteTask = async (activityId: string) => {
    try {
      await updateActivityMutation.mutateAsync({
        activityId,
        data: { completedAt: new Date().toISOString() },
      });
      toast.success("Task marked as complete!");
      refetchToday();
      refetchOverdue();
      refetchUpcoming();
    } catch (error) {
      toast.error("Failed to complete task");
      console.error("Complete task error:", error);
    }
  };

  const handleEditTask = (activity: Activity) => {
    setEditingActivity(activity);
    setEditFormData({
      subject: activity.subject,
      description: activity.description || "",
      priority: activity.priority,
      dueDate: activity.dueDate ? activity.dueDate.split("T")[0] : "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingActivity) return;

    try {
      await updateActivityMutation.mutateAsync({
        activityId: editingActivity.activityId,
        data: {
          subject: editFormData.subject,
          description: editFormData.description,
          priority: editFormData.priority,
          dueDate: editFormData.dueDate
            ? `${editFormData.dueDate}T09:00:00.000Z`
            : undefined,
        },
      });
      toast.success("Task updated successfully!");
      setShowEditDialog(false);
      setEditingActivity(null);
      refetchToday();
      refetchOverdue();
      refetchUpcoming();
    } catch (error) {
      toast.error("Failed to update task");
      console.error("Update task error:", error);
    }
  };

  const handleDeleteTask = async (activityId: string) => {
    try {
      await deleteActivityMutation.mutateAsync(activityId);
      toast.success("Task deleted successfully!");
      refetchToday();
      refetchOverdue();
      refetchUpcoming();
    } catch (error) {
      toast.error("Failed to delete task");
      console.error("Delete task error:", error);
    }
  };

  const totalToday = todaysTasks?.length || 0;
  const totalOverdue = overdueTasks?.length || 0;
  const totalUpcoming = upcomingTasks?.length || 0;
  const completedToday =
    todaysTasks?.filter((task) => task.completedAt)?.length || 0;

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Today's Tasks
                </p>
                <p className="text-2xl font-bold">{totalToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-950 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Overdue
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {totalOverdue}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Completed Today
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {completedToday}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Upcoming
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalUpcoming}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-950 rounded-full flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Completion Rate
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalToday > 0
                    ? Math.round((completedToday / totalToday) * 100)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Follow-up Tasks
            </CardTitle>
            <CardDescription>
              Stay on top of your pipeline with scheduled follow-ups and
              reminders
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchToday();
                refetchOverdue();
                refetchUpcoming();
              }}
              disabled={loadingToday || loadingOverdue || loadingUpcoming}
            >
              {loadingToday || loadingOverdue ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCcw className="h-4 w-4 mr-2" />
              )}
              Refresh
            </Button>
            <Dialog open={showScheduler} onOpenChange={setShowScheduler}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Follow-up
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Schedule Follow-up</DialogTitle>
                </DialogHeader>

                {/* Lead Selection */}
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">
                    Select Lead <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a lead...</option>
                    {leadsData?.leads?.map((lead: any) => (
                      <option key={lead.leadId} value={lead.leadId}>
                        {lead.firstName} {lead.lastName} -{" "}
                        {lead.businessName || lead.email}
                      </option>
                    ))}
                  </select>
                  {!selectedLeadId && (
                    <p className="text-sm text-red-600 mt-1">
                      Please select a lead to create a follow-up task
                    </p>
                  )}
                </div>

                {selectedLeadId && (
                  <FollowUpScheduler
                    leadId={selectedLeadId}
                    onSuccess={() => {
                      setShowScheduler(false);
                      setSelectedLeadId("");
                      refetchToday();
                      refetchOverdue();
                      refetchUpcoming();
                    }}
                    onCancel={() => setShowScheduler(false)}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="today" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Today ({totalToday})
              </TabsTrigger>
              <TabsTrigger value="overdue" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Overdue ({totalOverdue})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming ({totalUpcoming})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="today" className="mt-6">
              {loadingToday ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : todaysTasks && todaysTasks.length > 0 ? (
                <div className="space-y-4">
                  {todaysTasks.map((task) => (
                    <TaskCard
                      key={task.activityId}
                      activity={task}
                      onComplete={handleCompleteTask}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                  <p className="text-muted-foreground mb-4">
                    No follow-ups scheduled for today. Great job staying on top
                    of your pipeline!
                  </p>
                  <Button
                    onClick={() => setShowScheduler(true)}
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule a Follow-up
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="overdue" className="mt-6">
              {loadingOverdue ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : overdueTasks && overdueTasks.length > 0 ? (
                <div className="space-y-4">
                  {overdueTasks.map((task) => (
                    <TaskCard
                      key={task.activityId}
                      activity={task}
                      onComplete={handleCompleteTask}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No overdue tasks!
                  </h3>
                  <p className="text-muted-foreground">
                    You're staying on top of your follow-ups. Keep up the
                    excellent work!
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="mt-6">
              {loadingUpcoming ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : upcomingTasks && upcomingTasks.length > 0 ? (
                <div className="space-y-4">
                  {upcomingTasks.map((task) => (
                    <TaskCard
                      key={task.activityId}
                      activity={task}
                      onComplete={handleCompleteTask}
                      onEdit={handleEditTask}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No upcoming tasks
                  </h3>
                  <p className="text-muted-foreground">
                    You don't have any follow-ups scheduled for the next 7 days.
                    Create a new follow-up to stay connected with your leads!
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-subject">Subject *</Label>
              <Input
                id="edit-subject"
                value={editFormData.subject}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    subject: e.target.value,
                  }))
                }
                placeholder="Task subject"
                required
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Task description (optional)"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-priority">Priority</Label>
              <Select
                value={editFormData.priority}
                onValueChange={(value: Activity["priority"]) =>
                  setEditFormData((prev) => ({ ...prev, priority: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-duedate">Due Date</Label>
              <Input
                id="edit-duedate"
                type="date"
                value={editFormData.dueDate}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    dueDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={
                  !editFormData.subject.trim() ||
                  updateActivityMutation.isPending
                }
              >
                {updateActivityMutation.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
