"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useTasks } from "@/hooks/use-tasks";
import { useUsers } from "@/hooks/use-users";
import { Clock, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function OverdueTasksPage() {
  const { tasks, getOverdueTasks, updateTask } = useTasks();
  const { currentUser } = useUsers();

  const overdueTasks = getOverdueTasks();

  const handleTaskToggle = async (taskId: string, completed: boolean) => {
    try {
      await updateTask(taskId, {
        completed,
        status: completed ? "Completed" : "Pending",
      });
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-red-100 text-red-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Call":
        return "📞";
      case "Meeting":
        return "🤝";
      case "Email":
        return "📧";
      case "Task":
        return "✅";
      default:
        return "📝";
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = now.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <DashboardLayout
      title="Overdue Tasks"
      description={`${overdueTasks.length} tasks are past their due date and need immediate attention`}
    >
      <div className="space-y-6">
        {/* Alert Card */}
        {overdueTasks.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="w-5 h-5" />
                Urgent Attention Required
              </CardTitle>
              <CardDescription className="text-red-700">
                You have {overdueTasks.length} overdue tasks that need immediate
                attention
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Overdue Tasks */}
        {overdueTasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All Caught Up!</h3>
              <p className="text-muted-foreground">
                You have no overdue tasks. Great job staying on top of things!
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-red-600" />
                Overdue Tasks ({overdueTasks.length})
              </CardTitle>
              <CardDescription>
                Tasks that are past their due date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overdueTasks.map((task) => {
                  const daysOverdue = getDaysOverdue(task.due_date!);
                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-4 border rounded-lg bg-red-50 border-red-200"
                    >
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={(checked) =>
                          handleTaskToggle(task.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">
                            {getTypeIcon(task.type)}
                          </span>
                          <h4 className="font-medium">{task.title}</h4>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          <Badge variant="destructive">
                            {daysOverdue} day{daysOverdue !== 1 ? "s" : ""}{" "}
                            overdue
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Due:{" "}
                            {format(
                              new Date(task.due_date!),
                              "MMM dd, yyyy 'at' h:mm a"
                            )}
                          </div>
                          <div>Type: {task.type}</div>
                          <div>
                            Assigned to:{" "}
                            {task.assigned_to === currentUser?.id
                              ? "You"
                              : "Other"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common actions to help manage overdue tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-3">
              <Button
                variant="outline"
                className="justify-start bg-transparent"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Reschedule All
              </Button>
              <Button
                variant="outline"
                className="justify-start bg-transparent"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All Complete
              </Button>
              <Button
                variant="outline"
                className="justify-start bg-transparent"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Send Reminders
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
